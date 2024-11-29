import React, { useState, useEffect } from "react";

type User = {
  id: number;
  name: string;
};

const CommunicationForm = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [sender, setSender] = useState<string>("");
  const [receiver, setReceiver] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  // ユーザーリストをAPIから取得
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users"); // ユーザーリストを取得するエンドポイント
        const data = await res.json();
        setUsers(data);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, []);

  // フォーム送信時の処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sender || !receiver || sender === receiver) {
      setMessage("送信者と受信者を正しく選択してください。");
      return;
    }

    try {
      const res = await fetch("/api/communications/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sender, receiver }),
      });

      if (res.ok) {
        setMessage("コミュニケーションが登録されました！");
        setSender("");
        setReceiver("");
      } else {
        const errorData = await res.json();
        setMessage(`エラー: ${errorData.message}`);
      }
    } catch (error) {
      console.error("Error adding communication:", error);
      setMessage("サーバーとの通信でエラーが発生しました。");
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "0 auto", padding: "20px" }}>
      <h2>コミュニケーション登録</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "10px" }}>
          <label htmlFor="sender">送信者:</label>
          <select
            id="sender"
            value={sender}
            onChange={(e) => setSender(e.target.value)}
            style={{ display: "block", width: "100%", padding: "8px" }}
          >
            <option value="">選択してください</option>
            {users.map((user) => (
              <option key={user.id} value={user.name}>
                {user.name}
              </option>
            ))}
          </select>
          {sender && <p>選択した送信者: {sender}</p>}
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label htmlFor="receiver">受信者:</label>
          <select
            id="receiver"
            value={receiver}
            onChange={(e) => setReceiver(e.target.value)}
            style={{ display: "block", width: "100%", padding: "8px" }}
          >
            <option value="">選択してください</option>
            {users.map((user) => (
              <option key={user.id} value={user.name}>
                {user.name}
              </option>
            ))}
          </select>
          {receiver && <p>選択した受信者: {receiver}</p>}
        </div>

        <button type="submit" style={{ padding: "10px 20px", backgroundColor: "#007bff", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>
          登録
        </button>
      </form>

      {message && (
        <p style={{ marginTop: "10px", color: message.includes("エラー") ? "red" : "green" }}>
          {message}
        </p>
      )}
    </div>
  );
};

export default CommunicationForm;
