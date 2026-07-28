import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../services/api';

const savedUser = JSON.parse(localStorage.getItem('community_user') || 'null');

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('community_user');
    const { data } = await api.post('/auth/login', credentials);
    return data.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Unable to sign in');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: savedUser, token: localStorage.getItem('access_token'), loading: false, error: null },
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('community_user');
    },
    // Used by non-form sign-in flows (Google) that resolve tokens outside the
    // login thunk's request/response shape.
    setCredentials(state, action) {
      const { user, accessToken, refreshToken } = action.payload;
      state.user = user;
      state.token = accessToken;
      state.error = null;
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      localStorage.setItem('community_user', JSON.stringify(user));
    },
  },
  extraReducers: (builder) => builder
    .addCase(login.pending, (state) => { state.loading = true; state.error = null; })
    .addCase(login.fulfilled, (state, action) => {
      state.loading = false;
      state.user = action.payload.user;
      state.token = action.payload.accessToken;
      localStorage.setItem('access_token', action.payload.accessToken);
      localStorage.setItem('refresh_token', action.payload.refreshToken);
      localStorage.setItem('community_user', JSON.stringify(action.payload.user));
    })
    .addCase(login.rejected, (state, action) => { state.loading = false; state.error = action.payload; }),
});

export const { logout, setCredentials } = authSlice.actions;
export default authSlice.reducer;
