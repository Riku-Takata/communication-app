// client/src/pages/input.tsx

import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'

interface Member {
  _id: string
  name: string
}

interface CommunicationInputProps {
  user: Member
}

const CommunicationInput = () => {
  const [members, setMembers] = useState<Member[]>([])
  const [toMember, setToMember] = useState('')
  const router = useRouter()
  const [user, setUser] = useState<Member | null>(null)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    } else {
      router.replace('/login')
    }
  }, [router])

  useEffect(() => {
    if (user) {
      axios.get('/api/members')
        .then(response => {
          const filteredMembers: Member[] = response.data.filter((member: Member) => member.name !== 'admin' && member._id !== user._id)
          setMembers(filteredMembers)
        })
        .catch(error => {
          console.error('メンバーの取得に失敗しました', error)
        })
    }
  }, [user])

  const handleSubmit = async () => {
    try {
      await axios.post('/api/communications', { from: user?._id, to: toMember })
      alert('コミュニケーションが記録されました')
      setToMember('')
    } catch (error) {
      console.error('コミュニケーションの記録に失敗しました', error)
      alert('コミュニケーションの記録に失敗しました')
    }
  }

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <h2>コミュニケーション入力</h2>
      <p>送り手は {user.name} です</p>
      <select value={toMember} onChange={(e) => setToMember(e.target.value)}>
        <option value="">受け手を選択</option>
        {members.map(member => (
          <option key={member._id} value={member._id}>
            {member.name}
          </option>
        ))}
      </select>
      <button onClick={handleSubmit} disabled={!toMember}>送信</button>
    </div>
  )
}

export default CommunicationInput
