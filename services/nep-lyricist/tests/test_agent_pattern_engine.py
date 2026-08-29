import pytest
from factory.vector_store import VectorStore
from factory.pattern_engine import PatternEngine
from factory.deepseek_agent import DeepSeekAgent

def test_vector_store_embedding_and_search():
    vs = VectorStore()
    vec = vs.embed_text("फूलको आँखामा फूलै संसार")
    assert len(vec) == 384

    vs.add_song_vector("test_1", "Phulko", "Ani", "Spiritual", "devanagari", "फूलको आँखामा फूलै संसार")
    matches = vs.search_similar_stanzas("फूलको आँखामा", script="devanagari", limit=1)
    assert len(matches) == 1
    assert matches[0]['song_title'] == "Phulko"
    assert matches[0]['similarity_score'] > 0.0

def test_pattern_engine_script_detection():
    pe = PatternEngine()
    assert pe.detect_script("फूलको आँखामा फूलै संसार") == "devanagari"
    assert pe.detect_script("Timro maya le sadhai samjhi rahnchhu") == "romanized"

def test_pattern_engine_extract_patterns():
    pe = PatternEngine()
    patterns = pe.extract_patterns("फूलको आँखामा फूलै संसार\nकाँडाको आँखामा काँडै संसार", num_lines_to_generate=4)
    assert patterns['script'] == 'devanagari'
    assert patterns['line_count'] == 2
    assert patterns['target_lines_count'] == 4
    assert 'meter' in patterns
    assert len(patterns['vector_matches']) > 0

def test_deepseek_agent_generation_devanagari():
    agent = DeepSeekAgent()
    res = agent.generate_completion(
        current_lines="फूलको आँखामा फूलै संसार\nकाँडाको आँखामा काँडै संसार",
        num_lines_to_generate=4
    )
    assert res['success'] is True
    assert res['num_lines_generated'] == 4
    assert res['pattern_metrics']['script'] == 'devanagari'
    assert 'vector_matches_count' in res['pattern_metrics']
    assert len(res['generated_lines'].split('\n')) == 4
    assert len(res['reasoning_steps']) > 0

def test_deepseek_agent_generation_romanized():
    agent = DeepSeekAgent()
    res = agent.generate_completion(
        current_lines="Timro maya le sadhai samjhi rahnchhu\nAfno man ko katha lekhi rahnchhu",
        num_lines_to_generate=3
    )
    assert res['success'] is True
    assert res['num_lines_generated'] == 3
    assert res['pattern_metrics']['script'] == 'romanized'
    assert len(res['generated_lines'].split('\n')) == 3
