import { IMessageActionPayload } from '../types';
import { fetchAllMrs, fetchListDiffData } from '../services/gitlab';
import User from '../models/user';

export async function runCheck({ msg, bot }: IMessageActionPayload) {
	const chatId = msg.chat.id;

	await bot.sendMessage(chatId, 'Запускаем проверку...');

	const user = await User.findById(chatId);

	if (!user) {
		return;
	}
	const mrList = await fetchAllMrs({ 'not[author_username]': user.gitlabUsername });
	const data = await fetchListDiffData(mrList.map(mr => mr.iid));

	console.log({ data });
}
