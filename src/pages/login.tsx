// client/src/pages/login.tsx

import React, { useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'

const Login = () => {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()

  const handleSubmit = async () => {
    try {
      const response = await axios.post('/api/login', { name, password })
      // ログイン成功時の処理（例：トークンの保存、ユーザー情報の管理）
      // ここでは簡略化のため、ローカルストレージにユーザー情報を保存します
      localStorage.setItem('user', JSON.stringify(response.data.member))
      router.push('/graph')
    } catch (error) {
      console.error('ログインに失敗しました', error)
      alert('名前またはパスワードが正しくありません')
    }
  }

  return (
    <div>
      <h2>ログイン</h2>
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
      <button onClick={handleSubmit} disabled={!name || !password}>ログイン</button>
    </div>
  )
}

export default Login
