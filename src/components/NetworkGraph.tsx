// src/components/NetworkGraph.tsx

import React, { useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph3D, { ForceGraphMethods } from 'react-force-graph-3d';
import { GraphData, NodeObject, LinkObject } from '../types/graph';
import { fetchGraphData, fetchDailyData } from '../utils/transformGraphData';
import { supabase } from '@/lib/SupabaseClient';
import * as THREE from 'three'; // Three.js をインポート


const NetworkGraph: React.FC = () => {
  const fgRef = useRef<ForceGraphMethods<NodeObject, LinkObject>>();

  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [isFocused, setIsFocused] = useState(false);
  const [allCommunicated, setAllCommunicated] = useState(false);


  // グラフデータ取得時に1週間分と当日分を両方取得
  const loadData = async () => {
    const weekData = await fetchGraphData();
    const dailyVolumes = await fetchDailyData();

    // dailyVolumesをgraphDataに反映
    // ここでは、linksに対応するreceiverにdailyValueを付与
    const updatedLinks = weekData.links.map(link => {
      const receiverId = (typeof link.target === 'object') ? link.target.id : link.target;
      const dVal = dailyVolumes[receiverId] || 0;
      return { ...link, dailyValue: dVal };
    });

    const updatedNodes = weekData.nodes.map(node => {
      // node.idが1以外の場合、dailyValue設定
      // sender(id=1)にもdailyValue付けるなら下記条件分岐は不要
      const dVal = node.id === 11 ? 0 : (dailyVolumes[node.id] || 0);
      return { ...node, dailyValue: dVal };
    });

    // Calculate sender's total weekly volume
    const totalSenderWeeklyVolume = updatedLinks
    .filter(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      return sourceId === 11;
    })
    .reduce((acc, link) => acc + (link.value || 0), 0);

    // Check if sender communicated with all other members today
    const allCommunicated = updatedNodes
    .filter(node => node.id !== 11)
    .every(node => node.dailyValue > 0);

    // If all receivers have daily communication, set sender's dailyValue to 1
    const finalNodes = updatedNodes.map(node => {
    if (node.id === 11) {
      return { 
        ...node, 
        dailyValue: allCommunicated ? 1 : 0,
        weeklyVolume: totalSenderWeeklyVolume 
      };
    }
    return node;
    });

    setAllCommunicated(allCommunicated);

    setGraphData({ nodes: finalNodes, links: updatedLinks });

  };

  useEffect(() => {
    loadData();
    const communicationListener = supabase
      .channel('public:communication')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'communication' },
        (payload) => {
          console.log('Change received!', payload);
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(communicationListener);
    };
  }, []);

  // リンク長は1週間分に基づく
  const volumes = useMemo(() => graphData.links.map((link) => link.value), [graphData.links]);
  const minVolume = useMemo(() => (volumes.length > 0 ? Math.min(...volumes) : 0), [volumes]);
  const maxVolume = useMemo(() => (volumes.length > 0 ? Math.max(...volumes) : 0), [volumes]);

  const minDistance = 15; 
  const maxDistance = 80; 

  useEffect(() => {
    if (fgRef.current && graphData.links.length > 0) {
      fgRef.current
        .d3Force('link')
        ?.distance((link: LinkObject) => {
          const normalizedValue =
            (link.value - minVolume) / (maxVolume - minVolume || 1);
          return minDistance + (maxDistance - minDistance) * normalizedValue;
        });

      fgRef.current.d3ReheatSimulation();
    }
  }, [graphData, minVolume, maxVolume]);

  const focusOnNode = (node: NodeObject) => {
    const distance = 65;
    const nodeX = node.x ?? 0;
    const nodeY = node.y ?? 0;
    const nodeZ = node.z ?? 0;
    const distRatio =
      1 + distance / Math.hypot(nodeX || 0.1, nodeY || 0.1, nodeZ || 0.1);

    fgRef.current?.cameraPosition(
      { x: nodeX * distRatio, y: nodeY * distRatio, z: nodeZ * distRatio },
      { x: nodeX, y: nodeY, z: nodeZ },
      1000
    );
  };

  const getNodeId = (node: number | NodeObject) => {
    return typeof node === 'object' ? node.id : node;
  };

  return (
    <ForceGraph3D<NodeObject, LinkObject>
      ref={fgRef}
      graphData={graphData}
      nodeLabel="name"
      backgroundColor={allCommunicated ? "white" : "black"}
      // ノードの画像や表情は当日のコミュニケーションで判定
      nodeVal={(node) => {
        if (node.id === 11) return 8;

        // 当日1回でもコミュニケーションがあれば小さく、なければデフォルトなど自由に決定可能
        // ここでは特にロジック変えずそのまま
        const connectedLink = graphData.links.find((link) => {
          const sourceId = getNodeId(link.source);
          const targetId = getNodeId(link.target);

          return (
            (sourceId === node.id && targetId === 11) ||
            (targetId === node.id && sourceId === 11)
          );
        });

        if (!connectedLink) return 5;

        // nodeValは元々1週間分で判定していたが、当日ベースにするなら下記ロジックを変更可能
        // 今回は例として維持
        const normalizedValue =
          (connectedLink.value - minVolume) / (maxVolume - minVolume || 1);
        const distance =
          minDistance + (maxDistance - minDistance) * normalizedValue;

        const threshold = (minDistance + maxDistance) / 3;

        return distance < threshold ? 3 : 5; 
      }}
      nodeColor={(node) => {
        if (node.id === 11) return 'blue';
        return 'gray';
      }}
      nodeThreeObject={(node) => {
        const group = new THREE.Group();

        const dailyVal = node.dailyValue || 0;
        const isSmiling = dailyVal > 0;

        const textureLoader = new THREE.TextureLoader();
        const textureUrl = isSmiling ? node.smile_image_url : node.tearful_image_url;
        const texture = textureLoader.load(textureUrl);

        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        
        // Check the sender's weekly volume
        if (node.id === 11 && (node.weeklyVolume || 0) < 100) {
          spriteMaterial.transparent = true;
          spriteMaterial.opacity = 0.5; // Adjust as desired
        }

        const sprite = new THREE.Sprite(spriteMaterial);

        if (node.id === 11) {
          // senderの場合、当日のコミュニケーションチェック
          // 送信者も当日誰かと1回でもコミュニケーションあれば笑顔、なければ涙など自由に決定可能
          sprite.scale.set(12, 12, 1);
          group.add(sprite);

          const chosenTexts = isSmiling
            ? [node.smile_emotion1, node.smile_emotion2]
            : [node.tearful_emotion1, node.tearful_emotion2];

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;
          const canvasWidth = 2048;
          const canvasHeight = 1024;
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;

          context.clearRect(0, 0, canvasWidth, canvasHeight); 
          context.fillStyle = 'white'; 
          context.font = '100px Arial'; 
          context.textAlign = 'center';
          context.textBaseline = 'middle'; 

          const line1 = chosenTexts[0] || '';
          context.fillText(line1, canvasWidth / 2, canvasHeight / 2);

          const textureCanvas = new THREE.CanvasTexture(canvas);
          const labelMaterial = new THREE.SpriteMaterial({ map: textureCanvas });
          const labelSprite = new THREE.Sprite(labelMaterial);
          labelSprite.scale.set(12, 6, 1);
          labelSprite.position.set(0, 8, 0);
          group.add(labelSprite);

        } else {
          sprite.scale.set(isSmiling ? 8 : 16, isSmiling ? 8 : 16, 1);
          group.add(sprite);

          const chosenTexts = isSmiling
            ? [node.smile_emotion1, node.smile_emotion2]
            : [node.tearful_emotion1, node.tearful_emotion2];

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;
          const canvasWidth = 2048;
          const canvasHeight = 1024;
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;

          context.clearRect(0, 0, canvasWidth, canvasHeight); 
          context.fillStyle = allCommunicated ? 'black' : 'white'
          context.font = '100px Arial'; 
          context.textAlign = 'center';
          context.textBaseline = 'middle'; 

          const line1 = node.name + '「' + (chosenTexts[0] || '') + '」';
          context.fillText(line1, canvasWidth / 2, canvasHeight / 2);

          const textureCanvas = new THREE.CanvasTexture(canvas);
          const labelMaterial = new THREE.SpriteMaterial({ map: textureCanvas });
          const labelSprite = new THREE.Sprite(labelMaterial);
          labelSprite.scale.set(12, 6, 1);
          labelSprite.position.set(0, 8, 0);
          group.add(labelSprite);
        }

        return group;
      }}
      onEngineStop={() => {
        if (!isFocused && graphData.nodes.length > 0) {
          setTimeout(() => {
            const node = graphData.nodes.find((node) => node.id === 11);
            if (node && node.x !== undefined && node.y !== undefined && node.z !== undefined) {
              focusOnNode(node);
              setIsFocused(true);
            }
          }, 1);
        }
      }}
    />
  );
};

export default NetworkGraph;
