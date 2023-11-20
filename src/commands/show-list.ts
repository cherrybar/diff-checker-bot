import { ChatState, IMessageActionPayload } from '../types';
import User from '../models/user';

export async function showList({ chatId, bot }: IMessageActionPayload) {
	const user = await User.findById(chatId);
	if (!user) {
		return;
	}
	await user.updateOne({ state: ChatState.Default });

	if (!user.watchingPaths.length) {
		await bot.sendMessage(chatId, 'ℹ️ Список файлов пуст');
		return;
	}
	await bot.sendMessage(chatId, `ℹ️ Список файлов:\n\n${user.watchingPaths.join('\n\r')}`);
}
