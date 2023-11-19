import { IMessageActionPayload } from '../types';

export async function removeFromWatching({ msg, bot }: IMessageActionPayload) {
	await bot.sendMessage(
		msg.chat.id,
		`Укажите пути к файлам, которые необходимо удалить. Можно указать как отдельные файлы, так и директории. Каждый путь должен начинаться с новой строки. Пример: src/components/main.vue\n\rsrc/components`,
	);
}
