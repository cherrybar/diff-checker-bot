import { IMessageActionPayload } from '../types';
import User from '../models/user';

export async function showList({ msg, bot }: IMessageActionPayload) {
	const chatId = msg.chat.id;
	const user = await User.findById(chatId);
	if (!user) {
		return;
	}
	await bot.sendMessage(chatId, `ℹ️ Список файлов:\n\n${user.watchingPaths.join('\n\r')}`);
}
