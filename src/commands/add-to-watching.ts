import { Button, ChatState, IDbUser, IMessageActionPayload } from '../types';
import TelegramBot from 'node-telegram-bot-api';
import { HydratedDocument } from 'mongoose';
import User from '../models/user';

export async function addToWatching({ chatId, bot }: IMessageActionPayload) {
	await bot.sendMessage(
		chatId,
		'ℹ️ Укажи пути к файлам, которые необходимо добавить. Можно указать как отдельные файлы, так и директории. Каждый путь должен начинаться с новой строки. Пример: \n\rsrc/components/main.vue\n\rsrc/components',
		{
			reply_markup: {
				inline_keyboard: [[{ text: 'Отмена', callback_data: Button.Cancel }]],
			},
		},
	);

	const user = await User.findById(chatId);
	if (!user) {
		return;
	}
	await user.updateOne({ state: ChatState.WaitingForDataToAdd });
}

export async function addToWatchingResponseHandler({ text, bot, chatId, user }: { text: string; bot: TelegramBot; chatId: number; user: HydratedDocument<IDbUser> }) {
	const paths = text.split('\n');

	const result = await user.updateOne({ $addToSet: { watchingPaths: { $each: paths } } });

	const msgText = result.modifiedCount === 1 ? '✅ Список файлов обновлен' : '⛔️ Ошибка. Такой файл уже есть в списке';
	await bot.sendMessage(chatId, msgText);
	await user.updateOne({ state: ChatState.Default });
}
