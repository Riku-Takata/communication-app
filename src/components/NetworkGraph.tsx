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

  // コミュニケーション量の最小・最大値を計算
  const volumes = useMemo(() => graphData.links.map((link) => link.value), [graphData.links]);
  const minVolume = useMemo(() => (volumes.length > 0 ? Math.min(...volumes) : 0), [volumes]);
  const maxVolume = useMemo(() => (volumes.length > 0 ? Math.max(...volumes) : 0), [volumes]);

  // エッジの最小・最大長を定義
  const minDistance = 7; // 最小のエッジ長
  const maxDistance = 120; // 最大のエッジ長

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
    const distance = 55;
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
          // id=1 の場合のロジック
          const allReceivers = graphData.nodes.filter((n) => n.id !== 1); // id=1以外のノードを取得
          const hasAnyLowCommunication = graphData.links.some((link) => {
            return link.source === 1 && link.value < 20; // id=1 から他のノードへのコミュニケーション量が 20 未満
          });

          const isCommunicatingWellWithAll =
            allReceivers.length > 0 &&
            !hasAnyLowCommunication && // id=1が全員と20回以上コミュニケーションを取っているか
            allReceivers.every((receiver) =>
              graphData.links.some(
                (link) =>
                  link.source === 1 &&
                  link.target === receiver.id &&
                  link.value >= 20
              )
            );

          // URLを選択
          const textureLoader = new THREE.TextureLoader();
          const textureUrl = isCommunicatingWellWithAll
            ? node.smile_image_url // 全員と20回以上コミュニケーションの場合
            : node.tearful_image_url; // 1人でも20回未満の場合
          const texture = textureLoader.load(textureUrl);

          // スプライト作成
          const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
          const sprite = new THREE.Sprite(spriteMaterial);
          sprite.scale.set(12, 12, 1); // スプライトサイズ
          group.add(sprite);

          // ラベル部分
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;
          const canvasWidth = 2048; // キャンバスの幅（解像度を高めに設定）
          const canvasHeight = 1024; // キャンバスの高さ

          canvas.width = canvasWidth;
          canvas.height = canvasHeight;

          context.clearRect(0, 0, canvasWidth, canvasHeight); // 背景をクリア
          context.fillStyle = 'white'; // テキストの色
          context.font = '100px Arial'; // フォントサイズを調整
          context.textAlign = 'center';
          context.textBaseline = 'middle'; // テキストの基準線を中央に設定
          context.fillText(
            `全然コミュニケーション取れてないよ...`,
            canvasWidth / 2, // キャンバス中央のX座標
            canvasHeight / 2 // キャンバス中央のY座標
          );

          const textureCanvas = new THREE.CanvasTexture(canvas);
          const labelMaterial = new THREE.SpriteMaterial({ map: textureCanvas });
          const labelSprite = new THREE.Sprite(labelMaterial);

          // スプライトのスケーリング（サイズを適切に調整）
          labelSprite.scale.set(12, 6, 1); // スプライトの横幅と高さを調整

          // スプライトの位置を調整（画像の上に配置）
          labelSprite.position.set(0, 8, 0);
          group.add(labelSprite);
        } else {
          // その他ノードの場合のロジック
          const connectedLink = graphData.links.find((link) => {
            const sourceId = getNodeId(link.source);
            const targetId = getNodeId(link.target);
            return (
              (sourceId === node.id && targetId === 1) ||
              (targetId === node.id && sourceId === 1)
            );
          });

          const textureLoader = new THREE.TextureLoader();
          const isSmiling = connectedLink && connectedLink.value >= 20;
          const textureUrl = isSmiling ? node.smile_image_url : node.tearful_image_url;
          const texture = textureLoader.load(textureUrl);

          // スプライト作成
          const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
          const sprite = new THREE.Sprite(spriteMaterial);
          sprite.scale.set(isSmiling ? 8 : 16, isSmiling ? 8 : 16, 1); // 笑顔は小さく、泣き顔は大きく
          group.add(sprite);
      
          // ラベル部分
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;
          const canvasWidth = 2048; // キャンバスの幅（解像度を高めに設定）
          const canvasHeight = 1024; // キャンバスの高さ

          canvas.width = canvasWidth;
          canvas.height = canvasHeight;

          context.clearRect(0, 0, canvasWidth, canvasHeight); // 背景をクリア
          context.fillStyle = 'white'; // テキストの色
          context.font = '100px Arial'; // フォントサイズを調整
          context.textAlign = 'center';
          context.textBaseline = 'middle'; // テキストの基準線を中央に設定
          context.fillText(
            node.name + `${connectedLink && connectedLink.value >= 20 ? '「うれしい！！！！！」' : '「嫌われてるのかな...」'}`,
            canvasWidth / 2, // キャンバス中央のX座標
            canvasHeight / 2 // キャンバス中央のY座標
          );

          const textureCanvas = new THREE.CanvasTexture(canvas);
          const labelMaterial = new THREE.SpriteMaterial({ map: textureCanvas });
          const labelSprite = new THREE.Sprite(labelMaterial);

          // スプライトのスケーリング（サイズを適切に調整）
          labelSprite.scale.set(12, 6, 1); // スプライトの横幅と高さを調整

          // スプライトの位置を調整（画像の上に配置）
          labelSprite.position.set(0, 8, 0);
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
