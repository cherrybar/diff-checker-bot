import { IMessageActionPayload } from '../types';

export default async function ({ chatId, bot }: IMessageActionPayload) {
	await bot.sendMessage(
		chatId,
		`Укажите пути к файлам, которые необходимо добавить. Можно указать как отдельные файлы, так и директории. Каждый путь должен начинаться с новой строки. Пример: src/components/main.vue\n\rsrc/components`,
	);
}
