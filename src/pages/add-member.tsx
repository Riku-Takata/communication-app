// client/src/pages/add-member.tsx

import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'

interface Member {
  _id: string
  name: string
}

const AddMember = () => {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()
  const [user, setUser] = useState<Member | null>(null)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      const parsedUser: Member = JSON.parse(storedUser)
      setUser(parsedUser)
      if (parsedUser.name !== 'admin') {
        router.replace('/graph')
      }
    } else {
      router.replace('/login')
    }
  }, [router])

  const handleSubmit = async () => {
    try {
      await axios.post('/api/members', { name, password })
      alert('メンバーが追加されました')
      setName('')
      setPassword('')
    } catch (error) {
      console.error('メンバーの追加に失敗しました', error)
      alert('メンバーの追加に失敗しました')
    }
  }

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <h2>メンバーの追加</h2>
      <input
        type="text"
        placeholder="名前"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="password"
        placeholder="パスワード"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleSubmit} disabled={!name || !password}>追加</button>
    </div>
  )
}

export default AddMember
