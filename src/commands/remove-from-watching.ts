import { Button, ChatState, IMessageActionPayload } from '../types';
import User from '../models/user';

export async function removeFromWatching({ msg, bot }: IMessageActionPayload) {
	const chatId = msg.chat.id;
	await bot.sendMessage(chatId, 'ℹ️ Укажи пути, которые необходимо удалить', {
		reply_markup: {
			inline_keyboard: [[{ text: 'Отмена', callback_data: Button.Cancel }]],
		},
	});
	const user = await User.findById(chatId);

	if (!user) {
		return;
	}

	await user.updateOne({ state: ChatState.WaitingForDataToRemove });
}

export async function removeFromWatchingResponseHandler({ text, bot, chatId, user }: { text: string; bot: any; chatId: number; user: any }) {
	const paths = text.split('\n');

	const result = await user.updateOne({ $pull: { watchingPaths: { $in: paths } } });

	const resultText = result.modifiedCount === 1 ? '✅ Список файлов обновлен' : '⛔️ Ошибка. Такого файла нет в списке';
	await bot.sendMessage(chatId, resultText);

	await user.updateOne({ state: ChatState.Default });
}
