// src/components/NetworkGraph.tsx

import React, { useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph3D, { ForceGraphMethods } from 'react-force-graph-3d';
import { GraphData, NodeObject, LinkObject } from '../types/graph';
import { fetchGraphData } from '../utils/transformGraphData';

const NetworkGraph: React.FC = () => {
  const fgRef = useRef<ForceGraphMethods<NodeObject, LinkObject>>();

  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [isFocused, setIsFocused] = useState(false);

  // コミュニケーション量の最小・最大値を計算
  const volumes = useMemo(() => graphData.links.map((link) => link.value), [graphData.links]);
  const minVolume = useMemo(() => (volumes.length > 0 ? Math.min(...volumes) : 0), [volumes]);
  const maxVolume = useMemo(() => (volumes.length > 0 ? Math.max(...volumes) : 0), [volumes]);

  // エッジの最小・最大長を定義
  const minDistance = 10; // 最小のエッジ長
  const maxDistance = 200; // 最大のエッジ長

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
        if (node.id === 1) return 3;

        // ノードに接続されているリンクを取得（nodeがsourceで、targetがid=1）
        const connectedLink = graphData.links.find(
          (link) => {
            const sourceId = getNodeId(link.source);
            const targetId = getNodeId(link.target);

            return (
              (sourceId === node.id && targetId === 1) ||
              (targetId === node.id && sourceId === 1)
            );
          }
        );

        // 接続されているリンクがない場合はデフォルトのサイズを返す
        if (!connectedLink) return 3;

        // エッジの距離を計算
        const normalizedValue =
          (connectedLink.value - minVolume) / (maxVolume - minVolume || 1);
        const distance =
          minDistance + (maxDistance - minDistance) * normalizedValue;

        // エッジ長の中間値をしきい値として設定
        const threshold = (minDistance + maxDistance) / 2;

        // エッジ長がしきい値より小さい場合はサイズを小さく
        if (distance < threshold) {
          return 1; // サイズを小さく設定
        } else {
          return 3; // デフォルトのサイズ
        }
      }}
      nodeColor={(node) => {
        // IDが1のノードは青色
        if (node.id === 1) return 'blue';

        // ノードに接続されているリンクを取得（nodeがsourceで、targetがid=1）
        const connectedLink = graphData.links.find(
          (link) => {
            const sourceId = getNodeId(link.source);
            const targetId = getNodeId(link.target);

            return (
              (sourceId === node.id && targetId === 1) ||
              (targetId === node.id && sourceId === 1)
            );
          }
        );

        // 接続されているリンクがない場合はグレーを返す
        if (!connectedLink) return 'gray';

        // エッジの距離を計算
        const normalizedValue =
          (connectedLink.value - minVolume) / (maxVolume - minVolume || 1);
        const distance =
          minDistance + (maxDistance - minDistance) * normalizedValue;

        // エッジ長の中間値をしきい値として設定
        const threshold = (minDistance + maxDistance) / 2;

        // エッジ長がしきい値より小さい場合は赤色、そうでなければ緑色を返す
        if (distance < threshold) {
          return 'red';
        } else {
          return 'green';
        }
      }}
      onEngineStop={() => {
        if (!isFocused && graphData.nodes.length > 0) {
          // 1ミリ秒後にIDが1のノードにフォーカス
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
