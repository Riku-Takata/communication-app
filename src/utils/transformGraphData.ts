// src/utils/transformGraphData.ts

import { supabase } from '../lib/SupabaseClient';
import { GraphData, NodeObject, LinkObject } from '../types/graph';

// 1週間分のデータ取得（従来）
export const fetchGraphData = async (): Promise<GraphData> => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const { data: communicationsData, error: commError } = await supabase
    .from('communication')
    .select('*')
    .gte('communication_date', oneWeekAgo.toISOString());

  if (commError) {
    console.error('Error fetching communications:', commError);
    return { nodes: [], links: [] };
  }

  const { data: senderData, error: senderError } = await supabase
    .from('member')
    .select('id, name, smile_image_url, tearful_image_url, tearful_emotion1, tearful_emotion2, smile_emotion1, smile_emotion2')
    .eq('id', 1);

  if (senderError || !senderData || senderData.length === 0) {
    console.error('Error fetching sender member:', senderError);
    return { nodes: [], links: [] };
  }

  const receiverIds = communicationsData?.map(comm => comm.receiver_id) || [];

  const { data: receiversData, error: receiversError } = await supabase
    .from('member')
    .select('id, name, smile_image_url, tearful_image_url, tearful_emotion1, tearful_emotion2, smile_emotion1, smile_emotion2')
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
    tearful_emotion1: senderData[0].tearful_emotion1,
    tearful_emotion2: senderData[0].tearful_emotion2,
    smile_emotion1: senderData[0].smile_emotion1,
    smile_emotion2: senderData[0].smile_emotion2,
  };

  const receiverNodes: NodeObject[] = (receiversData || []).map(member => ({
    id: member.id,
    name: member.name,
    group: 'Receiver',
    smile_image_url: member.smile_image_url,
    tearful_image_url: member.tearful_image_url,
    tearful_emotion1: member.tearful_emotion1,
    tearful_emotion2: member.tearful_emotion2,
    smile_emotion1: member.smile_emotion1,
    smile_emotion2: member.smile_emotion2,
  }));

  const nodes = [senderNode, ...receiverNodes];

  const links: LinkObject[] = receiverNodes.map(receiver => {
    const totalVolume = (communicationsData || [])
      .filter(comm => comm.receiver_id === receiver.id)
      .reduce((sum, comm) => sum + comm.communication_volume, 0);

    return {
      source: senderNode.id,
      target: receiver.id,
      value: totalVolume, // 1週間分の値
    };
  });

  return { nodes, links };
};

// 当日分のデータ取得
export const fetchDailyData = async (): Promise<{ [key: number]: number }> => {
  const today = new Date();
  today.setHours(0,0,0,0); // 今日の0時以降のデータ
  const { data: dailyComms, error: dailyError } = await supabase
    .from('communication')
    .select('*')
    .gte('communication_date', today.toISOString());

  if (dailyError) {
    console.error('Error fetching daily communications:', dailyError);
    return {};
  }

  // receiver_idをキーに当日ボリューム合計を計算
  const dailyVolumes: { [receiverId: number]: number } = {};
  (dailyComms || []).forEach(comm => {
    if (!dailyVolumes[comm.receiver_id]) {
      dailyVolumes[comm.receiver_id] = 0;
    }
    dailyVolumes[comm.receiver_id] += comm.communication_volume;
  });

  return dailyVolumes;
};
