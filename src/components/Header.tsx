// src/components/Header.tsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/SupabaseClient';

interface HeaderProps {
  onMemberSelect: (memberId: number | null) => void;
}

interface Member {
  id: number;
  name: string;
}

const Header: React.FC<HeaderProps> = ({ onMemberSelect }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      const { data: membersData, error } = await supabase.from('member').select('*');
      if (error) {
        console.error('Error fetching members:', error);
      } else {
        const membersList = (membersData || []).map(member => ({
          id: Number(member.id),
          name: member.name,
        }));
        setMembers(membersList);
      }
    };

    fetchMembers();
  }, []);

  return (
    <header className="header">
      <nav>
        <ul>
          <li onClick={() => setShowDropdown(!showDropdown)}>
            メンバー
            {showDropdown && (
              <ul className="dropdown">
                {members.map(member => (
                  <li key={member.id} onClick={() => onMemberSelect(member.id)}>
                    {member.name}
                  </li>
                ))}
                <li onClick={() => onMemberSelect(null)}>全体表示</li>
              </ul>
            )}
          </li>
          <li>
            {/* コミュニケーション入力のリンクやその他のナビゲーション項目 */}
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;
