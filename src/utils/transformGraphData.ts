// src/utils/transformGraphData.ts

import { supabase } from '../lib/SupabaseClient';
import { GraphData, NodeObject, LinkObject } from '../types/graph';

export const fetchGraphData = async (): Promise<GraphData> => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7); // 1週間前の日付を計算

  // 過去1週間のコミュニケーションデータを取得
  const { data: communicationsData, error: commError } = await supabase
    .from('communication')
    .select('*')
    .gte('communication_date', oneWeekAgo.toISOString());

  if (commError) {
    console.error('Error fetching communications:', commError);
    return { nodes: [], links: [] };
  }

  // ノードとリンクの作成
  const { data: senderData, error: senderError } = await supabase
    .from('member')
    .select('*')
    .eq('id', 1);

  if (senderError || !senderData || senderData.length === 0) {
    console.error('Error fetching sender member:', senderError);
    return { nodes: [], links: [] };
  }

  const receiverIds = communicationsData?.map(comm => comm.receiver_id) || [];

  const { data: receiversData, error: receiversError } = await supabase
    .from('member')
    .select('*')
    .in('id', receiverIds);

  if (receiversError) {
    console.error('Error fetching receiver members:', receiversError);
    return { nodes: [], links: [] };
  }

  const senderNode: NodeObject = {
    id: senderData[0].id,
    name: senderData[0].name,
    group: 'Sender',
    smile_image_url: senderData[0].smile_image_url,
    tearful_image_url: senderData[0].tearful_image_url,
  };

  const receiverNodes: NodeObject[] = (receiversData || []).map(member => ({
    id: member.id,
    name: member.name,
    group: 'Receiver',
    smile_image_url: member.smile_image_url,
    tearful_image_url: member.tearful_image_url,
  }));

  const nodes = [senderNode, ...receiverNodes];

  // コミュニケーション量を集計してリンクを作成
  const links: LinkObject[] = receiverNodes.map(receiver => {
    const totalVolume = (communicationsData || [])
      .filter(comm => comm.receiver_id === receiver.id)
      .reduce((sum, comm) => sum + comm.communication_volume, 0);

    return {
      source: senderNode.id,
      target: receiver.id,
      value: totalVolume,
    };
  });

  return { nodes, links };
};
