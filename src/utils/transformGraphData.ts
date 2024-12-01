// src/utils/transformGraphData.ts

import { supabase } from '../lib/SupabaseClient';
import { GraphData, NodeObject, LinkObject } from '../types/graph';

export const fetchGraphData = async (): Promise<GraphData> => {
  // sender_id が 1 のコミュニケーションのみ取得
  const { data: communicationsData, error: commError } = await supabase
    .from('communication')
    .select('*')
    .eq('sender_id', 1);

  if (commError) {
    console.error('Error fetching communications:', commError);
    return { nodes: [], links: [] };
  }

  // 受信者のメンバーIDを取得
  const receiverIds = communicationsData?.map(comm => comm.receiver_id) || [];

  // sender_id が 1 のメンバー情報を取得
  const { data: senderData, error: senderError } = await supabase
    .from('member')
    .select('*')
    .eq('id', 1);

  if (senderError || !senderData || senderData.length === 0) {
    console.error('Error fetching sender member:', senderError);
    return { nodes: [], links: [] };
  }

  // 受信者のメンバー情報を取得
  const { data: receiversData, error: receiversError } = await supabase
    .from('member')
    .select('*')
    .in('id', receiverIds);

  if (receiversError) {
    console.error('Error fetching receiver members:', receiversError);
    return { nodes: [], links: [] };
  }

  // ノードの作成
  const senderNode: NodeObject = {
    id: senderData[0].id,
    name: senderData[0].name,
    group: 'Sender',
  };

  const receiverNodes: NodeObject[] = (receiversData || []).map(member => ({
    id: member.id,
    name: member.name,
    group: 'Receiver',
  }));

  const nodes = [senderNode, ...receiverNodes];

  // リンクの作成
  const links: LinkObject[] = (communicationsData || []).map(comm => ({
    source: comm.sender_id,
    target: comm.receiver_id,
    value: comm.communication_volume,
  }));

  return { nodes, links };
};
