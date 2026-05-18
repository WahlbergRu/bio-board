export interface CommandDef {
  id: string;
  label: string;
  template: string;
  keywords: string[];
  description: string;
}

export const COMMANDS: CommandDef[] = [
  {
    id: "create",
    label: "Добавить задачу",
    template: "добавь задачу {name}",
    keywords: ["добавь", "создай", "create", "new"],
    description: "Создать новую задачу (пр.: добавь задачу Дизайн)",
  },
  {
    id: "shift",
    label: "Сдвинуть задачу",
    template: "{name} сдвинь на {days} дня",
    keywords: ["сдвинь", "перенеси", "двигай", "shift", "move"],
    description: "Сдвинуть задачу на N дней (пр.: Тест сдвинь на 3 дня)",
  },
  {
    id: "copy",
    label: "Скопировать задачу",
    template: "{name} скопируй",
    keywords: ["скопируй", "клон", "дублируй", "copy", "duplicate"],
    description: "Дублировать задачу (пр.: Тест скопируй)",
  },
  {
    id: "assign",
    label: "Назначить исполнителя",
    template: "{name} назначь {person}",
    keywords: ["назначь", "assign", "ответственный", "исполнитель"],
    description: "Назначить человека (пр.: Тест назначь Иван)",
  },
  {
    id: "move",
    label: "Перенести на дату",
    template: "{name} перенеси на {date}",
    keywords: ["перенеси", "move", "дата"],
    description: "Перенести на дату (пр.: Тест перенеси на 2026-05-25)",
  },
  {
    id: "link",
    label: "Связать задачи",
    template: "{name} связана с {dep}",
    keywords: ["свяжи", "связана", "связан", "зависит", "привяжи"],
    description: "Связать две задачи (пр.: Тест связана с Backend)",
  },
  {
    id: "delete",
    label: "Удалить задачу",
    template: "{name} удали",
    keywords: ["удали", "убери", "delete", "remove"],
    description: "Удалить задачу (пр.: Тест удали)",
  },
  {
    id: "llm",
    label: "Спросить LLM",
    template: "/llm {text}",
    keywords: ["llm", "ai", "спроси", "чат", "вопрос", "расскажи"],
    description: "Прямой запрос к LLM (напр.: /llm какие риски у проекта?)",
  },
];
