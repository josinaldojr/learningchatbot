const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");

require("dotenv").config();
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

const axios_instance = axios.create({
  baseURL: 'https://pokeapi.co/api/v2',
  timeout: 4000,
});

const pokemon_endpoint = ['abilities', 'moves', 'photo'];
const pokemon_species_endpoint = ['description', 'evolution'];

app.post("/pokedex", async (req, res) => {

  try {
    const { intent, parameters, outputContexts, queryText } = req.body.queryResult;

    const pokemon = (parameters.pokemon) ? parameters.pokemon.toLowerCase().replace('.', '-').replace(' ', '') : '';
    const specs = parameters.specs;
    const get_type_effectiveness = (parameters.type_effectiveness) ? true : false;

    let response_obj = {};

    if (pokemon_endpoint.indexOf(specs) !== -1) {
      const { data } = await axios_instance.get(`/pokemon/${pokemon}`);

      let fulfillmentText;
      const id = String(data.id).padStart(3, '0');
      const value = (specs == 'abilities') ? data.abilities.map(item => item.ability.name).join(', ') : data.moves.map(item => item.move.name).join(', ');

      fulfillmentText = `The ${specs} of ${pokemon} are: ${value}`;

      Object.assign(response_obj, { fulfillmentText });

      if (specs == 'photo') {
        Object.assign(response_obj, {
          fulfillmentText: pokemon,
          payload: {
            is_image: true,
            url: `https://www.pkparaiso.com/imagenes/xy/sprites/global_link/${id}.png`
          }
        });
      }
    }

    if (pokemon_species_endpoint.indexOf(specs) !== -1 || intent.displayName == 'evolution') {

      const { data } = await axios_instance.get(`/pokemon-species/${pokemon}`);

      const evolution_chain_id = data.evolution_chain.url.split('/')[6];
      const text = data.flavor_text_entries.find(item => {
        return item.language.name == 'en';
      });

      let fulfillmentText;
      if (specs == 'description') {
        fulfillmentText = `${pokemon}:\n\n ${text.flavor_text}`;
        Object.assign(response_obj, {
          fulfillmentText
        });
      }

      if (intent.displayName == 'evolution') {
        const evolution_response = await axios_instance.get(`/evolution-chain/${evolution_chain_id}`);
        const evolution_requirement = parameters.evolutions;

        let pokemon_evolutions = [evolution_response.data.chain.species.name];

        fulfillmentText = `${pokemon} has no evolution`;

        if (evolution_response.data.chain.evolves_to.length) {
          pokemon_evolutions.push(evolution_response.data.chain.evolves_to[0].species.name);
        }

        if (evolution_response.data.chain.evolves_to[0].evolves_to.length) {
          pokemon_evolutions.push(evolution_response.data.chain.evolves_to[0].evolves_to[0].species.name);
        }

        let evolution_chain = pokemon_evolutions.join(' -> ');

        const order_in_evolution_chain = pokemon_evolutions.indexOf(pokemon);
        const next_form = pokemon_evolutions[order_in_evolution_chain + 1];
        const previous_form = pokemon_evolutions[order_in_evolution_chain - 1];

        const evolution_text = {
          'evolution_chain': `${pokemon}'s evolution chain is: ${evolution_chain}`,
          'first_evolution': (pokemon == pokemon_evolutions[0]) ? `This is already the first form` : `${pokemon_evolutions[0]} is the first evolution`,
          'last_evolution': (pokemon == pokemon_evolutions[pokemon_evolutions.length - 1]) ? `This is already the final form` : pokemon_evolutions[pokemon_evolutions.length - 1],
          'next_form': `${pokemon} evolves to ${next_form}`,
          'previous_form': `${pokemon} evolves from ${previous_form}`
        };

        if (evolution_text[evolution_requirement]) {
          fulfillmentText = evolution_text[evolution_requirement];
        }

        Object.assign(response_obj, {
          fulfillmentText
        });
      }
    }

    if (get_type_effectiveness) {
      const pokemon_type = parameters.pokemon_types;
      let type_effectiveness = parameters.type_effectiveness;
      const type_effectiveness_formatted = type_effectiveness.replace(/_/g, ' ');
      const type_effectiveness_word = outputContexts[0].parameters['type_effectiveness.original'];

      let from_or_to = type_effectiveness.split('_')[2];

      const pokemon_type_comes_first = (queryText.indexOf(pokemon_type) < queryText.indexOf(type_effectiveness_word)) ? true : false;

      const exempt_words = ['resistant', 'no damage', 'zero damage', 'no effect'];
      const has_exempt_words = exempt_words.some(v => type_effectiveness_word.includes(v));

      if (
        (pokemon_type_comes_first && !has_exempt_words) ||
        (!pokemon_type_comes_first && has_exempt_words)
      ) {
        let new_from_or_to = (from_or_to == 'from') ? 'to' : 'from';
        type_effectiveness = type_effectiveness.replace(from_or_to, new_from_or_to);
        from_or_to = new_from_or_to;
      }

      const response = await axios_instance.get(`/type/${pokemon_type}`);
      const damage_relations = (response.data.damage_relations[type_effectiveness].length > 0) ? response.data.damage_relations[type_effectiveness].map(item => item.name).join(', ') : 'none';

      const nature_of_damage = (from_or_to == 'from') ? 'receives' : 'inflicts';

      fulfillmentText = (nature_of_damage == 'inflicts') ?
        `${pokemon_type} type inflicts ${type_effectiveness_formatted} ${damage_relations} type` :
        `${pokemon_type} ${nature_of_damage} ${type_effectiveness_formatted} the following: ${damage_relations}`;

      Object.assign(response_obj, {
        fulfillmentText
      });
    }

    return res.json(response_obj);

  } catch (err) {
    console.log('err: ', err);
    return res.json({
      fulfillmentText: "Sorry, the API is currently unavailable"
    });
  }
});


const PORT = 5000;
app.listen(PORT, (err) => {
  if (err) {
    console.error(err);
  } else {
    console.log(`Running on ports ${PORT}`);
  }
});