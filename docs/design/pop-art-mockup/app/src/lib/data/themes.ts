export interface PopTheme {
	id: 'zap' | 'wave' | 'frame' | 'halftone';
	code: string;
	title: string;
	year: string;
	quote: string;
	subquote: string;
	primary: string;
	secondary: string;
	accent: string;
	bg: string;
	dot: string;
}

export const POP_THEMES: PopTheme[] = [
	{
		id: 'zap',
		code: '01',
		title: 'ZAP!',
		year: 'RED',
		quote: 'EVERY CALL GETS A RECEIPT. EVERY RECEIPT CAN BE CHECKED!',
		subquote: 'Red, yellow and blue • Bold outlines',
		primary: '#FF1E27',
		secondary: '#FFE600',
		accent: '#0055FF',
		bg: '#FFFDF5',
		dot: '#FF1E27'
	},
	{
		id: 'wave',
		code: '02',
		title: 'BIG WAVE',
		year: 'BLUE',
		quote: 'ASK ME ANYTHING. I ONLY ANSWER FROM WHAT I CAN SHOW YOU!',
		subquote: 'Blues and cyan • Ben-Day waves',
		primary: '#0055FF',
		secondary: '#00D4FF',
		accent: '#FFE600',
		bg: '#F0F8FF',
		dot: '#0055FF'
	},
	{
		id: 'frame',
		code: '03',
		title: 'IN THE FRAME',
		year: 'PINK',
		quote: 'STEP RIGHT UP! DON\'T TAKE MY WORD FOR IT, CHECK THE RECEIPT!',
		subquote: 'Hot pink, gold and noir',
		primary: '#FF007F',
		secondary: '#FFE600',
		accent: '#111111',
		bg: '#FFF9FB',
		dot: '#FF007F'
	},
	{
		id: 'halftone',
		code: '04',
		title: 'POP HALFTONE',
		year: 'ORANGE',
		quote: 'DOTS, OUTLINES AND FLAT COLOUR. THAT IS THE WHOLE TRICK!',
		subquote: 'Ben-Day Dot Study • Primary CMYK Palette',
		primary: '#FF6B00',
		secondary: '#FFE600',
		accent: '#00A859',
		bg: '#FFFDF0',
		dot: '#111111'
	}
];
