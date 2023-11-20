import { ChatState, IMessageActionPayload } from '../types';
import User from '../models/user';

export async function removeFromWatching({ msg, bot }: IMessageActionPayload) {
	const chatId = msg.chat.id;
	await bot.sendMessage(
		msg.chat.id,
		`Укажите пути к файлам, которые необходимо удалить. Можно указать как отдельные файлы, так и директории. Каждый путь должен начинаться с новой строки. Пример: src/components/main.vue\n\rsrc/components`,
	);

	const user = await User.findById(chatId);

	if (!user) {
		return;
	}

	await user.updateOne({ state: ChatState.WaitingForDataToRemove });
}

export async function removeFromWatchingResponseHandler({ text, bot, chatId, user }: { text: string; bot: any; chatId: number; user: any }) {
	const paths = text.split('\n');

	const result = await user.updateOne({ $pull: { watchingPaths: { $in: paths } } });
	console.log({ result });

	if (result.modifiedCount === 1) {
		bot.sendMessage(chatId, 'Список файлов обновлен');
	} else if (result.matchedCount === 1) {
		bot.sendMessage(chatId, 'Ошибка. Такого файла нет в списке');
	}
	await user.updateOne({ state: ChatState.Default });
}
