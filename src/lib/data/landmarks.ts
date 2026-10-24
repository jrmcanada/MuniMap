/**
 * Remarkable things about individual municipalities, for the status bar ticker. One line each,
 * shown at random. Each line must be checked against a reliable source before it is added, and
 * kept under 120 characters so it fits the bar. Add your own the same way.
 */
export interface Landmark {
	/** Name as it appears in municipalities.ts. */
	municipality: string;
	text: string;
}

export const landmarks: Landmark[] = [
	{
		municipality: 'Wawa',
		text: "Wawa's giant Canada goose has greeted drivers since 1960. The current steel one, about 8.5 m tall, went up in 2017."
	},
	{
		municipality: 'White River',
		text: 'Winnie-the-Pooh started in White River: in 1914 Harry Colebourn bought a bear cub there and named it Winnipeg.'
	},
	{
		municipality: 'Hornepayne',
		text: 'Hornepayne is the closest town to the geographic centre of Ontario.'
	},
	{
		municipality: 'Ignace',
		text: 'Near Ignace, White Otter Castle is a three-storey log castle that one man built between 1903 and 1914.'
	},
	{
		municipality: 'Espanola',
		text: 'Espanola began as a company town, built around a pulp and paper mill agreed with the province in 1899.'
	},
	{
		municipality: 'Dubreuilville',
		text: 'Dubreuilville began in 1961 as a company town for a lumber firm. Today the Island Gold mine is nearby.'
	},
	{
		municipality: 'Hilton Beach',
		text: 'Hilton Beach has a village jail that has never held a single prisoner.'
	},
	{
		municipality: 'St. Joseph',
		text: "St. Joseph Island has Fort St. Joseph, built in the 1790s as Canada's most westerly British military post."
	},
	{
		municipality: 'Cockburn Island',
		text: 'Cockburn Island once had a fishing and logging village, Tolsmaville. Its school held its last class in 1961.'
	},
	{
		municipality: 'Clearview',
		text: 'Clearview includes the village of Creemore, home of Creemore Springs Brewery.'
	}
];
