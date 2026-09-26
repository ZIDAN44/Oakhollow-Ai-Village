# How life works

The rules of the world are ordinary code. Where possible they follow a published model, so the numbers
have a basis. Constants are in `public/src/life/biology.js` and `public/src/core/constants.js`.

## Time

At 1× speed, one game minute passes every half second, so a game day is 12 real minutes. A year has
4 seasons of 4 days. The game starts on Summer 2. Crops regrow fastest in spring and almost not at all in winter.
In winter, people away from a bed get hungry faster, everyone is more likely to fall sick, and it snows. The harvest festival is on
Autumn 1, and the leader is re-elected each spring.

## Ageing

Everyone shares one biological clock. **Pace of life** in **God** sets how many life-years pass per
calendar year: 1, 4 (default), 8 or 16. At the default, a year of life passes every 4 game days.

## Mortality

The [Gompertz–Makeham law](https://en.wikipedia.org/wiki/Gompertz%E2%80%93Makeham_law_of_mortality):
the yearly risk of death is a constant term (0.002, for accidents) plus a term that grows exponentially
with age and doubles about every 8 years. Infants have a higher risk (12% in the first year, halved with a
fed, healthy carer) and children aged 1 to 5 a smaller one (1%).

Starvation, thirst, sickness and wounds lower health directly; a person dies at 0 health. Death can be
turned off in **God**.

## Pregnancy and birth

Romance, pregnancy and pronouns are separate settings per person, as in The Sims 4: gender, pronouns,
who they are attracted to, and whether they can carry or father a child. A pregnancy lasts 9 months of life
time. Labour starts some hours before the birth; the person can go home, go to a clinic, or send for a
healer.

Risks follow pre-industrial averages: 1.2% maternal death and 3% stillbirth per birth. Both are doubled
outdoors, reduced by 30% in a clinic, and reduced by at least 40% with a skilled healer present.

Couples who can't conceive can adopt a foundling or take in an orphan. Orphans find a guardian, by choice or
after half a day. Children go to school and choose a trade at 16.

## Disease

An [SIR model](https://en.wikipedia.org/wiki/Compartmental_models_in_epidemiology#The_SIR_model): sick
people infect susceptible people nearby, rest in a bed or clinic speeds recovery, and people who recover
are immune for 1.5 life-years. An outbreak becomes a village problem.

## Knowledge and movement

Nobody knows where everyone is. People remember where they last saw each person, and "go find someone"
walks to that spot. If the person has moved on, the search fails and the sighting is forgotten.

Paths use [A*](https://en.wikipedia.org/wiki/A*_search_algorithm) on a grid. Buildings and the river are
obstacles and the bridge is the crossing; wading is slow when the bridge is broken. Paths are shortened by
removing points that are in line of sight, and re-planned when the map changes or the person being followed
moves.

## Economy

Money moves between people; it isn't created from nothing:

- Buskers are paid by listeners. The market has a limited purse, refilled by outside trade.
- Shops sell only while someone minds them. The market closes at night. A room at the inn costs 2 coins.
- Prices follow supply. Food spoils: bread quickly, grain slowly.
- Farms, the forest and the river run out and regrow. Anyone may work the common fields; taking from
  someone else's land is theft.

## Memory, gossip and crime

Everything a person sees or hears becomes a memory with an importance from 1 to 10. Some memories carry a
short "gist" that spreads as gossip. Crimes are remembered by witnesses; the leader can fine or banish.
Laws invented by villagers are judged by Jev when someone is seen breaking them.

## Death and funerals

A death brings grief to people who were close, passes belongings to the spouse, then children, then the
village treasury, and schedules a funeral at the graveyard the next morning. Mourners who attend bond with
each other.

## The storyteller

Like the storyteller in RimWorld: when nothing notable has happened for 6 game hours, it may start an
event such as wolves, a storm, a caravan, a theft or a fever. It can be turned off in **God**.
