import mongoose, { Schema, Document } from 'mongoose';
import { ChatState, IDbUser } from '../types';

const userSchema: Schema = new Schema({
	_id: { type: String, required: true },
	telegramId: { type: Number, required: true, unique: true },
	gitlabUsername: { type: String },
	watchingPaths: [{ type: String }],
	state: { type: typeof ChatState },
	excludedProjects: { type: String },
	isSubscribed: { type: Boolean },
});

const User = mongoose.model<IDbUser & Document>('User', userSchema);

export default User;
