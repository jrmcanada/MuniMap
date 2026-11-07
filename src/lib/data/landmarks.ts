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
	},
	{
		municipality: 'East Ferris',
		text: 'The Dionne quintuplets were born in 1934 near Corbeil, in East Ferris, and all five survived infancy.'
	},
	{
		municipality: 'Billings',
		text: 'Billings Township has Bridal Veil Falls at Kagawong, a drop of about 11 metres on Manitoulin Island.'
	},
	{
		municipality: 'Carling',
		text: 'Killbear Provincial Park, on the Georgian Bay shore, lies in Carling Township.'
	},
	{
		municipality: 'Chapleau',
		text: "Near Chapleau, the Crown Game Preserve set up in 1925 is billed as the world's largest, at over 7,000 km²."
	},
	{
		municipality: 'Latchford',
		text: 'Latchford began in 1903 as Montreal River Station, a railway stop, and was later named for F. R. Latchford.'
	},
	{
		municipality: 'Matachewan',
		text: 'Gold was found near Matachewan in 1916, and its mines produced nearly a million ounces between 1934 and 1957.'
	},
	{
		municipality: 'Fauquier-Strickland',
		text: "Fauquier-Strickland's best known landmark is a roadside groundhog statue at Fauquier, on the Groundhog River."
	},
	{
		municipality: 'James',
		text: 'Silver found in James Township in 1906 started a mining boom around Elk Lake.'
	},
	{
		municipality: 'Georgian Bluffs',
		text: 'Georgian Bluffs formed on January 1, 2001, from the townships of Derby, Keppel, Sarawak, and Shallow Lake.'
	},
	{
		municipality: 'Markstay-Warren',
		text: 'Markstay-Warren was formed in 1999 by joining several townships, with villages Markstay, Warren, and Hagar.'
	},
	{
		municipality: 'Johnson',
		text: "Johnson Township's Desbarats, 54 km east of Sault Ste. Marie, is the mainland gateway to St. Joseph Island."
	},
	{
		municipality: 'Tehkummah',
		text: 'Tehkummah Township includes South Baymouth, where the MS Chi-Cheemaun ferry docks on Manitoulin Island.'
	},
	{
		municipality: 'Huron Shores',
		text: 'Iron Bridge, the centre of Huron Shores, was settled in 1879 and named for a bridge.'
	},
	{
		municipality: 'Dawson',
		text: 'Dawson was formed in 1997 from Atwood, Blue, Dilke, and Worthington, at the mouth of the Rainy River.'
	},
	{
		municipality: 'Mattawan',
		text: 'Mattawan Township is home to the Otto Holden Generating Station, a dam on the Ottawa River.'
	},
	{
		municipality: 'Nairn',
		text: 'Nairn and Hyman, incorporated in 1896, began as a logging community on the Spanish River.'
	},
	{
		municipality: 'Gordon-Barrie Island',
		text: 'Janet Head Lighthouse, built in 1879 at Gore Bay, stands in Gordon/Barrie Island.'
	},
	{
		municipality: 'Thornloe',
		text: 'Thornloe was home to Thornloe Cheese, which opened in 1940 and stopped production in 2023.'
	},
	{
		municipality: 'Gravenhurst',
		text: 'Dr. Norman Bethune was born in Gravenhurst in 1890. The steamship RMS Segwun there dates from 1887.'
	},
	{
		municipality: 'Ingersoll',
		text: 'Ingersoll made a cheese of about 7,300 pounds in 1866, which was later shown in England.'
	},
	{
		municipality: 'Prescott',
		text: "Prescott's Fort Wellington dates from 1813-14, and was rebuilt after the 1838 Battle of the Windmill."
	},
	{
		municipality: 'Smiths Falls',
		text: 'A former Hershey chocolate factory in Smiths Falls became the home of cannabis firm Tweed, later Canopy Growth.'
	},
	{
		municipality: 'Georgian Bay',
		text: 'In Georgian Bay Township, the Big Chute Marine Railway hauls boats up and over an 18 m hill.'
	}
];
