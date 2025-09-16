import { useEffect, useState } from "react";

export function useLocalUserId() {
  const [userId, setUserId] = useState("");
  useEffect(() => {
    let existing = localStorage.getItem("userId");
    if (!existing) {
      existing = `user_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem("userId", existing);
    }
    setUserId(existing);
  }, []);
  return userId;
}
