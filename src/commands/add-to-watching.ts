import { ChatState, IDbUser, IMessageActionPayload } from '../types';
import TelegramBot from 'node-telegram-bot-api';
import { HydratedDocument } from 'mongoose';
import User from '../models/user';

export async function addToWatching({ msg, bot }: IMessageActionPayload) {
	const chatId = msg.chat.id;

	await bot.sendMessage(
		chatId,
		`Укажи пути к файлам, которые необходимо добавить. Можно указать как отдельные файлы, так и директории. Каждый путь должен начинаться с новой строки. Пример: src/components/main.vue\n\rsrc/components`,
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

	if (result.modifiedCount === 1) {
		bot.sendMessage(chatId, '✅ Список файлов обновлен');
	} else if (result.matchedCount === 1) {
		bot.sendMessage(chatId, '⛔️ Ошибка. Такой файл уже есть в списке');
	}
	await user.updateOne({ state: ChatState.Default });
}
