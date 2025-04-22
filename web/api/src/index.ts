import { adminRouter } from './routes/admin';
app.use('/api/admin', adminRouter(io));
