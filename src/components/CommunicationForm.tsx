// import React, { useState } from 'react';
// import { supabase } from '../lib/SupabaseClient';
// import { Member } from '../types/graph';

// interface Props {
//   members: Member[];
//   onClose: () => void;
// }

// const CommunicationForm: React.FC<Props> = ({ members, onClose }) => {
//   const [senderId, setSenderId] = useState('');
//   const [receiverId, setReceiverId] = useState('');
//   const [volume, setVolume] = useState(1);

//   const handleSubmit = async () => {
//     await supabase.from('communication').insert([
//       {
//         sender_id: senderId,
//         receiver_id: receiverId,
//         communication_date: new Date(),
//         communication_volume: volume,
//       },
//     ]);
//     onClose();
//   };

//   return (
//     <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
//       <div className="bg-white p-4">
//         <h2>コミュニケーション入力</h2>
//         <select onChange={(e) => setSenderId(e.target.value)}>
//           <option value="">送信者を選択</option>
//           {members.map(member => (
//             <option key={member.id} value={member.id}>
//               {member.name}
//             </option>
//           ))}
//         </select>
//         <select onChange={(e) => setReceiverId(e.target.value)}>
//           <option value="">受信者を選択</option>
//           {members.map(member => (
//             <option key={member.id} value={member.id}>
//               {member.name}
//             </option>
//           ))}
//         </select>
//         <input type="number" value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
//         <button onClick={handleSubmit}>送信</button>
//         <button onClick={onClose}>キャンセル</button>
//       </div>
//     </div>
//   );
// };

// export default CommunicationForm;
