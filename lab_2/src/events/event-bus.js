// event-bus.js — глобальна шина подій між REST контролерами і WebSocket
import { EventEmitter } from 'events';

// один екземпляр на весь додаток — імпортуємо звідусіль
export const eventBus = new EventEmitter();
