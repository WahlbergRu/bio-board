export const ui = {
  // Header
  title: 'AI Планировщик',
  seedData: '🌱 Демо-данные',
  exportExcel: '📊 Excel',
  exportIcal: ' iCal',
  savePlan: '💾 Сохранить',
  autoSaveOn: 'Автосохранение: ВКЛ',
  autoSaveOff: 'Автосохранение: ВЫКЛ',

  // View switcher
  gantt: 'Диаграмма Ганта',
  kanban: 'Канбан',
  viewDay: 'День',
  viewWeek: 'Неделя',
  viewMonth: 'Месяц',
  viewQuarter: 'Квартал',

  // Kanban
  noAssignee: 'Без исполнителя',
  tasks: 'задач',
  dragToReassign: 'Перетащите для смены исполнителя',

  // Chat
  chatPlaceholder: 'Напишите команду: "Добавь задачу X на 3 дня после Y"',
  sending: 'Отправка...',
  lastMessages: 'Последние 100 сообщений',
  fileAttachment: 'Прикрепить файл',
  chatHistory: 'История чата',

  // Task modal
  taskDetails: 'Детали задачи',
  editTask: 'Редактировать',
  viewMode: 'Просмотр',
  editMode: 'Редактирование',
  save: 'Сохранить',
  cancel: 'Отмена',
  close: 'Закрыть',
  name: 'Название',
  description: 'Описание',
  startDate: 'Начало',
  endDate: 'Конец',
  progress: 'Прогресс',
  assignee: 'Исполнитель',
  type: 'Тип',
  dependencies: 'Зависимости',
  taskTypeTask: 'Задача',
  taskTypeMilestone: 'Веха',
  taskTypeProject: 'Проект',

  // Excel
  uploadExcel: '📥 Загрузить',
  uploadMode: 'Режим импорта',
  mergeMode: 'Объединить',
  overwriteMode: 'Заменить',
  parsing: 'Обработка...',
  chunkProgress: 'Обработано {processed} из {total}',
  selectFile: 'Выбрать файл',

  // Auth
  login: 'Войти',
  logout: 'Выйти',
  username: 'Логин',
  password: 'Пароль',
  loginTitle: 'Авторизация',
  loginError: 'Неверный логин или пароль',

  // Notifications
  saveSuccess: 'План сохранён',
  saveError: 'Ошибка сохранения',
  uploadSuccess: 'Загружено {count} задач',
  uploadError: 'Ошибка загрузки файла',
  exportSuccess: 'Экспорт завершён',
  cycleError: 'Обнаружена циклическая зависимость',
  taskLimit: 'Максимум 500 задач',
  llmError: 'Ошибка LLM',

  // Gantt
  noTasks: 'Нет задач. Загрузите Excel или добавьте через чат.',
  zoomIn: 'Увеличить',
  zoomOut: 'Уменьшить',
};
