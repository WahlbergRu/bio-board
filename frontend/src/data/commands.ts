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
    template: "добавь задачу ",
    keywords: ["добавь", "создай", "create", "new"],
    description: "Создать новую задачу",
  },
  {
    id: "shift",
    label: "Сдвинуть задачу",
    template: " сдвинь на  дней",
    keywords: ["сдвинь", "перенеси", "двигай", "shift", "move"],
    description: "Сдвинуть задачу на N дней",
  },
  {
    id: "copy",
    label: "Скопировать задачу",
    template: " скопируй",
    keywords: ["скопируй", "клон", "дублируй", "copy", "duplicate"],
    description: "Дублировать задачу",
  },
  {
    id: "delete",
    label: "Удалить задачу",
    template: " удали",
    keywords: ["удали", "убери", "delete", "remove"],
    description: "Удалить задачу",
  },
  {
    id: "assign",
    label: "Назначить исполнителя",
    template: " назначь ",
    keywords: ["назначь", "assign", "ответственный", "исполнитель"],
    description: "Назначить человека на задачу",
  },
  {
    id: "move",
    label: "Перенести на дату",
    template: " перенеси на ",
    keywords: ["перенеси", "move", "дата"],
    description: "Перенести задачу на конкретную дату (YYYY-MM-DD)",
  },
  {
    id: "link",
    label: "Связать задачи",
    template: " связана с ",
    keywords: ["свяжи", "связана", "связан", "зависит", "привяжи"],
    description: "Создать зависимость между двумя задачами",
  },
];
