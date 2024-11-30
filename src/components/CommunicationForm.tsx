"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/SupabaseClient";

type Member = {
  id: string;
  name: string;
};

const CommunicationForm = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [sender, setSender] = useState<string>("");
  const [receiver, setReceiver] = useState<string>("");
  const [count, setCount] = useState<number>(1);

  useEffect(() => {
    const fetchMembers = async () => {
      const { data } = await supabase.from("members").select("*");
      setMembers(data || []);
    };

    fetchMembers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sender || !receiver) {
      alert("Please select both sender and receiver.");
      return;
    }

    await supabase.from("communications").insert([
      { sender_id: sender, receiver_id: receiver, communication_count: count },
    ]);

    setSender("");
    setReceiver("");
    setCount(1);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Add Communication</h2>
      <div>
        <label>Sender:</label>
        <select
          value={sender}
          onChange={(e) => setSender(e.target.value)}
          required
        >
          <option value="">Select Sender</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label>Receiver:</label>
        <select
          value={receiver}
          onChange={(e) => setReceiver(e.target.value)}
          required
        >
          <option value="">Select Receiver</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label>Count:</label>
        <input
          type="number"
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          min={1}
          required
        />
      </div>
      <button type="submit">Add Communication</button>
    </form>
  );
};

export default CommunicationForm;
