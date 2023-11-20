import { IMergeRequest, IMessageActionPayload } from '../types';
import { fetchAllMrs, fetchListDiffData } from '../services/gitlab';
import User from '../models/user';

function extractProjectKey(str: string): string {
	return str.match(/\w{1,10}/)?.[0] || '';
}

export async function runCheck({ msg, bot }: IMessageActionPayload) {
	const chatId = msg.chat.id;

	await bot.sendMessage(chatId, '⏳ Запускаем проверку...');

	const user = await User.findById(chatId);

	if (!user) {
		return;
	}

	const mrList = await fetchAllMrs({ 'not[author_username]': user.gitlabUsername });
	const data = await fetchListDiffData(mrList.map(mr => mr.iid));

	const result: Set<IMergeRequest> = new Set();

	const watchingDirectories = user.watchingPaths.filter(path => !path.match(/^(.*\/)?([^/]+)\.(ts|vue)$/i));
	const watchingFiles = user.watchingPaths.filter(path => !watchingDirectories.includes(path));
	const excludedProjects = user.excludedProjects.split(', ');

	data.forEach(mrWithDiffs => {
		const mr = mrList.find(el => el.iid === mrWithDiffs.iid)!;
		const projectKey = extractProjectKey(mr.title);
		if (excludedProjects.includes(projectKey)) {
			return;
		}

		mrWithDiffs.diff.forEach(diff => {
			if (watchingFiles.includes(diff.old_path)) {
				result.add(mr);
				return;
			}

			if (watchingDirectories.some(path => diff.old_path.startsWith(path))) {
				result.add(mr);
			}
		});
	});

	if (!result.size) {
		await bot.sendMessage(chatId, 'ℹ️ Список mr пуст');
		return;
	}
	const textData = Array.from(result)
		.map((mr, index) => `${index + 1}) <a href="${mr.web_url}">${mr.title}</a>`)
		.join('\n');
	await bot.sendMessage(chatId, `🎉 Список mr:\n${textData}`, { parse_mode: 'HTML' });
}
