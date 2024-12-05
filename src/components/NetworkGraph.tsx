// src/components/NetworkGraph.tsx

import React, { useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph3D, { ForceGraphMethods } from 'react-force-graph-3d';
import * as THREE from 'three'; // Three.js をインポート
import { GraphData, NodeObject, LinkObject } from '../types/graph';
import { fetchGraphData } from '../utils/transformGraphData';
import { supabase } from '@/lib/SupabaseClient';

const NetworkGraph: React.FC = () => {
  const fgRef = useRef<ForceGraphMethods<NodeObject, LinkObject>>();

  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [isFocused, setIsFocused] = useState(false);

  // 画像テクスチャの読み込み
  const textureLoader = new THREE.TextureLoader();
  const sunTexture = useMemo(() => textureLoader.load('/smile_sun.jpg'), [textureLoader]);
  const cryTexture = useMemo(() => textureLoader.load('/cry_girl.png'), [textureLoader]);

  // コミュニケーション量の最小・最大値を計算
  const volumes = useMemo(() => graphData.links.map((link) => link.value), [graphData.links]);
  const minVolume = useMemo(() => (volumes.length > 0 ? Math.min(...volumes) : 0), [volumes]);
  const maxVolume = useMemo(() => (volumes.length > 0 ? Math.max(...volumes) : 0), [volumes]);

  // エッジの最小・最大長を定義
  const minDistance = 10; // 最小のエッジ長
  const maxDistance = 80; // 最大のエッジ長

  useEffect(() => {
    // 初期データの取得
    const loadData = async () => {
      const data = await fetchGraphData();
      setGraphData(data);
    };
    loadData();

    // リアルタイムリスナーの設定
    const communicationListener = supabase
      .channel('public:communication')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'communication' },
        (payload) => {
          console.log('Change received!', payload);
          // データの再取得
          loadData();
        }
      )
      .subscribe();

    // クリーンアップ関数
    return () => {
      supabase.removeChannel(communicationListener);
    };
  }, []);

  useEffect(() => {
    // データを取得してセット
    fetchGraphData().then((data) => setGraphData(data));
  }, []);

  // コミュニケーション量に応じたエッジの長さを設定
  useEffect(() => {
    if (fgRef.current && graphData.links.length > 0) {
      // d3Force を使用してリンクの距離を設定
      fgRef.current
        .d3Force('link')
        ?.distance((link: LinkObject) => {
          const normalizedValue =
            (link.value - minVolume) / (maxVolume - minVolume || 1);
          return minDistance + (maxDistance - minDistance) * normalizedValue;
        });

      // シミュレーションを再起動
      fgRef.current.d3ReheatSimulation();
    }
  }, [graphData, minVolume, maxVolume]);

  const focusOnNode = (node: NodeObject) => {
    const distance = 80;
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

  // ノードのIDを取得するヘルパー関数
  const getNodeId = (node: number | NodeObject) => {
    return typeof node === 'object' ? node.id : node;
  };

  return (
    <ForceGraph3D<NodeObject, LinkObject>
      ref={fgRef}
      graphData={graphData}
      nodeLabel="name"
      nodeVal={(node) => {
        // IDが1のノードはサイズを大きくする
        if (node.id === 1) return 8;

        // ノードに接続されているリンクを取得（nodeがsourceで、targetがid=1）
        const connectedLink = graphData.links.find((link) => {
          const sourceId = getNodeId(link.source);
          const targetId = getNodeId(link.target);

          return (
            (sourceId === node.id && targetId === 1) ||
            (targetId === node.id && sourceId === 1)
          );
        });

        // 接続されているリンクがない場合はデフォルトのサイズを返す
        if (!connectedLink) return 5;

        // エッジの距離を計算
        const normalizedValue =
          (connectedLink.value - minVolume) / (maxVolume - minVolume || 1);
        const distance =
          minDistance + (maxDistance - minDistance) * normalizedValue;

        // エッジ長の中間値をしきい値として設定
        const threshold = (minDistance + maxDistance) / 3;

        // エッジ長がしきい値より小さい場合はサイズを小さく
        if (distance < threshold) {
          return 3; // サイズを小さく設定
        } else {
          return 5; // デフォルトのサイズ
        }
      }}
      nodeColor={(node) => {
        // IDが1のノードは青色
        if (node.id === 1) return 'blue';

        // 画像ノード以外はグレー色
        return 'gray';
      }}
      nodeThreeObject={(node) => {
        // ノード全体をまとめるグループを作成
        const group = new THREE.Group();
      
        if (node.id === 1) {
          // ID=1の場合は青い球体を作成
          const sphereGeometry = new THREE.SphereGeometry(5, 32, 32); // 球体のサイズと分割数
          const sphereMaterial = new THREE.MeshBasicMaterial({ color: 'blue' }); // 青色のマテリアル
          const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
          group.add(sphere);
        } else {
          // その他のノードは画像で表示
          const connectedLink = graphData.links.find((link) => {
            const sourceId = getNodeId(link.source);
            const targetId = getNodeId(link.target);
            return (
              (sourceId === node.id && targetId === 1) ||
              (targetId === node.id && sourceId === 1)
            );
          });
      
          const texture = connectedLink && connectedLink.value >= 20 ? sunTexture : cryTexture;
          const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
          const sprite = new THREE.Sprite(spriteMaterial);
          sprite.scale.set(12, 12, 1); // スプライトのサイズを調整
          group.add(sprite);
      
          // ラベル部分
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;
          const size = 80; // ラベルのキャンバスサイズ
      
          canvas.width = size;
          canvas.height = size;
      
          context.clearRect(0, 0, size, size); // 背景は透明
          context.fillStyle = 'white'; // テキスト色
          context.font = '12px Arial'; // 小さいフォントサイズ
          context.textAlign = 'center';
          context.fillText(node.name || '名前不明', size / 2, size / 2 - 5);
          context.fillText(
            `状態: ${connectedLink && connectedLink.value >= 20 ? '笑顔' : '泣き顔'}`,
            size / 2,
            size / 2 + 10
          );
      
          const textureCanvas = new THREE.CanvasTexture(canvas);
          const labelMaterial = new THREE.SpriteMaterial({ map: textureCanvas });
          const labelSprite = new THREE.Sprite(labelMaterial);
          labelSprite.scale.set(6, 3, 1); // ラベルサイズを調整
          labelSprite.position.set(0, 8, 0); // ラベルを画像の上に配置
          group.add(labelSprite);
        }
      
        return group;
      }}
      
      onEngineStop={() => {
        if (!isFocused && graphData.nodes.length > 0) {
          // フォーカスをID=1のノードに移動
          setTimeout(() => {
            const node = graphData.nodes.find((node) => node.id === 1);
            if (
              node &&
              node.x !== undefined &&
              node.y !== undefined &&
              node.z !== undefined
            ) {
              focusOnNode(node);
              setIsFocused(true);
            }
          }, 1); // 1ミリ秒の遅延
        }
      }}
    />
  );
};

export default NetworkGraph;
