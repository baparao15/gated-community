import { configureStore } from '@reduxjs/toolkit';
import authReducer from './store/authSlice';
import uiReducer from './store/uiSlice';
import userReducer from './redux/userSlice';
import complaintReducer from './redux/complaintSlice';
import visitorReducer from './redux/visitorSlice';
import paymentReducer from './redux/paymentSlice';
import notificationReducer from './redux/notificationSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    users: userReducer,
    complaints: complaintReducer,
    visitors: visitorReducer,
    payments: paymentReducer,
    notifications: notificationReducer,
  },
});
