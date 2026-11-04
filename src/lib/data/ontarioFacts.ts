/**
 * Facts about Ontario and Northern Ontario for the status bar ticker. One line each, picked at
 * random. Each line must be checked against a reliable source before it is added, and kept under
 * 120 characters so it fits the bar.
 */
export interface Trivia {
	text: string;
}

export const ontarioFacts: Trivia[] = [
	{
		text: 'Highway 11 runs about 1,785 km across Ontario, the second longest highway in the province.'
	},
	{ text: 'Highways 11 and 17 both carry the Trans-Canada Highway through Northern Ontario.' },
	{
		text: 'Manitoulin Island, in Lake Huron, is widely called the largest freshwater island in the world.'
	},
	{
		text: 'Lake Superior is the largest freshwater lake in the world by surface area, at about 82,000 km².'
	},
	{
		text: "Northern Ontario holds roughly 88% of the province's land but only about 6% of its people."
	}
];
