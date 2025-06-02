from flask import Flask, request, jsonify, render_template
import requests

app = Flask(__name__)

visitados = []

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/add-visited', methods=['POST'])
def add_visited():
    data = request.get_json()
    pais = data.get('country')
    if pais and pais not in visitados:
        visitados.append(pais)
    return jsonify({'ok': True})

@app.route('/rota')
def rota():
    return jsonify({'rota': visitados})

@app.route('/estatisticas')
def estatisticas():
    return jsonify({
        'total_visitados': len(visitados),
        'paises': visitados
    })

@app.route('/weather')
def weather():
    city = request.args.get('city')
    try:
        response = requests.get(f'https://wttr.in/{city}?format=j1')
        data = response.json()
        weather = {
            'weather': [{'description': data['current_condition'][0]['weatherDesc'][0]['value']}],
            'main': {'temp': data['current_condition'][0]['temp_C']}
        }
        return jsonify(weather)
    except:
        return jsonify({'error': 'Clima não encontrado'}), 500

@app.route('/wiki')
def wiki():
    country = request.args.get('country')
    url = f'https://pt.wikipedia.org/api/rest_v1/page/summary/{country}'
    response = requests.get(url)
    if response.status_code == 200:
        return jsonify(response.json())
    return jsonify({'error': 'Wikipedia não encontrada'}), 404

def perguntar_ia(prompt):
  url = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1"
  headers = {"Accept": "application/json"}
  payload = {
    "inputs": prompt,
    "parameters": {"max_new_tokens": 200}
  }
  response = requests.post(url, headers=headers, json=payload)
  resposta = response.json()
  return resposta[0]["generated_text"] if isinstance(resposta, list) else "Erro ao responder"

@app.route('/ia-rota')
def ia_rota():
  country = request.args.get('country')
  prompt = f"Me sugira uma rota turística com os principais pontos para visitar no país {country}."
  resposta = perguntar_ia(prompt)
  return jsonify({"resposta": resposta})

@app.route('/ia-estatisticas')
def ia_estatisticas():
  country = request.args.get('country')
  population = request.args.get('population')
  area = request.args.get('area')
  languages = request.args.get('languages')

  prompt = (
    f"Explique de forma breve e didática os seguintes dados sobre o país {country}: "
    f"população de {population}, área de {area} km² e idiomas: {languages}."
  )
  resposta = perguntar_ia(prompt)
  return jsonify({"resposta": resposta})


if __name__ == '__main__':
    app.run(debug=True)
