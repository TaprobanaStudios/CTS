'use client';

import * as React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, CircularProgress, Container, TextField, Typography, Paper, Alert } from '@mui/material';

interface LoginViewProps {
  // Set when an open page found its session had ended
  sessionExpired?: boolean;
}

export default function LoginView({ sessionExpired = false }: LoginViewProps) {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      // The backend checks the password and answers with an http-only session cookie
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || 'Could not sign in. Is the server running?');
      }
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in');
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
      <Container maxWidth="xs">
        <Paper elevation={0} sx={{ width: '100%', borderRadius: 4, p: { xs: 3, sm: 5 }, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
            Sign In
          </Typography>
          <Box component="form" onSubmit={handleLogin}>
            {error ? (
              <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>
                {error}
              </Alert>
            ) : (
              sessionExpired && (
                <Alert severity="info" sx={{ mb: 2, borderRadius: '10px' }}>
                  Your session has ended. Please sign in again.
                </Alert>
              )
            )}
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Username"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 3 }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={submitting || !username.trim() || !password}
              sx={{ py: 1.5, fontWeight: 'bold' }}
            >
              {submitting ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
