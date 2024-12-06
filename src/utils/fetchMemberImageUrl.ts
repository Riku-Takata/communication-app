// import { supabase } from '../lib/SupabaseClient';

// /**
//  * Supabaseの`member`テーブルから画像URLを取得
//  * @param memberId メンバーのID
//  * @returns 画像URL（またはnull）
//  */
// export const fetchMemberImageUrl = async (memberId: number): Promise<string | null> => {
//   const { data, error } = await supabase
//     .from('member') // テーブル名
//     .select('image_url') // 取得する列
//     .eq('id', memberId) // 条件: IDが一致
//     .single(); // 一意の行を取得

//   if (error) {
//     console.error('Error fetching member image URL:', error.message);
//     return null;
//   }

//   return data?.image_url || null;
// };
