import { ChatState, IMessageActionPayload } from '../types';
import User from '../models/user';

export async function cancelCommand({ msg, bot }: IMessageActionPayload) {
	const chatId = msg.chat.id;
	await bot.sendMessage(chatId, 'Операция отменена');
	const user = await User.findById(chatId);
	if (!user) {
		return;
	}
	await user.updateOne({ state: ChatState.Default });
}
