import { IMessageActionPayload } from '../types';

export default async function ({ chatId, bot }: IMessageActionPayload) {
	await bot.sendMessage(chatId, 'Список файлов: ');
}
