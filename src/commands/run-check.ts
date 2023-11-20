import { IMergeRequest, IMessageActionPayload } from '../types';
import { fetchAllMrs, fetchListDiffData } from '../services/gitlab';
import User from '../models/user';

function extractProjectKey(str: string): string {
	return str.match(/\w{1,10}/)?.[0] || '';
}

export async function runCheck({ chatId, bot, isManual }: IMessageActionPayload & { isManual?: boolean }) {
	if (isManual) {
		await bot.sendMessage(chatId, '⏳ Запускаем проверку... Это может занять несколько минут');
	}

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

	if (!result.size && isManual) {
		await bot.sendMessage(chatId, 'ℹ️ Список mr пуст');
		return;
	}
	const textData = Array.from(result)
		.map((mr, index) => `${index + 1}) <a href="${mr.web_url}">${mr.title}</a>`)
		.join('\n');

	const title = isManual ? 'Список mr:' : 'В этих mr вносятся изменения в файлы, добавленные в наблюдаемые:';
	console.log(`Sent list of ${result.size} MRs to user ${chatId}`);
	await bot.sendMessage(chatId, `📄 ${title}\n${textData}`, { parse_mode: 'HTML' });
}

export async function runManualCheck({ chatId, bot }: IMessageActionPayload) {
	runCheck({ chatId, bot, isManual: true });
}
