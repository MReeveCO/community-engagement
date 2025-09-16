import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Button,
  Typography,
  Paper,
  Stack,
  TextField
} from "@mui/material";
import { useLocalUserId } from "../hooks/useLocalUserId";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function UserDetails() {
  const userId = useLocalUserId();
  const [form, setForm] = useState({
    name: "",
    email: "",
    address: "",
    dateOfBirth: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!userId) return;
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/users/${userId}`);
        if (!res.ok) throw new Error("load failed");
        const data = await res.json();
        if (!mounted) return;
        setForm({
          name: data?.name || "",
          email: data?.email || "",
          address: data?.address || "",
          dateOfBirth: data?.dateOfBirth || "",
        });
        setError("");
      } catch (e) {
        if (mounted) setError("Failed to load user details");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const canSave = useMemo(() => true, [form]);

  async function onSave(e) {
    e.preventDefault();
    if (!canSave) return;
    try {
      setSaving(true);
      setSaved(false);
      setError("");
      const res = await fetch(`${API_URL}/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          name: form.name.trim() || null,
          email: form.email.trim() || null,
          address: form.address.trim() || null,
          dateOfBirth: form.dateOfBirth || null,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
    } catch (e) {
      setError("Failed to save user details");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Typography>Loading your details...</Typography>;

  return (
    <Paper elevation={1} sx={{ p: 2 }}>
      <form onSubmit={onSave}>
        <Stack spacing={2}>
          <Typography variant="h6">Your Details</Typography>
          <TextField
            label="Full name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <TextField
            type="email"
            label="Email"
            value={form.email}
            onChange={(e) =>
              setForm((f) => ({ ...f, email: e.target.value }))
            }
          />
          <TextField
            label="Address"
            value={form.address}
            onChange={(e) =>
              setForm((f) => ({ ...f, address: e.target.value }))
            }
          />
          <TextField
            type="date"
            label="Date of birth"
            InputLabelProps={{ shrink: true }}
            value={form.dateOfBirth}
            onChange={(e) =>
              setForm((f) => ({ ...f, dateOfBirth: e.target.value }))
            }
          />
          <Stack direction="row" spacing={2}>
            <Button
              type="submit"
              variant="contained"
              disabled={saving || !canSave}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
            {saved && <Typography color="success.main">Saved</Typography>}
          </Stack>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ sm: "center" }}
          >
            <Button
              color="error"
              variant="outlined"
              onClick={async () => {
                if (
                  !confirm("Delete all your answers? This cannot be undone.")
                )
                  return;
                try {
                  await fetch(`${API_URL}/api/answers/${userId}`, {
                    method: "DELETE",
                  });
                  // No need to reload page; quiz will refetch when visited
                } catch {}
              }}
            >
              Delete all your answers
            </Button>
            <Typography variant="caption" color="text.secondary">
              Removes all your previously submitted answers.
            </Typography>
          </Stack>
          {error && <Typography color="error">{error}</Typography>}
        </Stack>
      </form>
    </Paper>
  );
}
