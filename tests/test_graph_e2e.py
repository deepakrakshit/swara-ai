"""
tests/test_graph_e2e.py -- End-to-End Test Suite for LangGraph 8-Stage Pipeline
"""

import os
import threading
import pytest
from src.graph import run_graph, _hitl_decisions, _hitl_events
class TestGraphPipeline:
    def test_8stage_pipeline_execution_with_approval(self):
        task_id = 'test_e2e_approved'
        _hitl_decisions[task_id] = True

        emitted_events = []
        def mock_emit(event, payload):
            emitted_events.append((event, payload))

        prompt = 'Draft the Q3 corrosion-trend memo for MRPL Unit 200 pumps P-101A and P-101B.'
        result = run_graph(
            task_id=task_id,
            prompt=prompt,
            route='agent_workflow',
            staging={},
            sse_emit=mock_emit,
        )

        assert result.get('timeline_step') == 8
        assert result.get('step_count') == 8
        assert result.get('hitl_approved') is True

        event_types = [e[0] for e in emitted_events]
        for evt in ['agent_plan', '[ROUTE]', 'tool_call', 'tool_result', 'verification', 'agent_hitl', 'hitl_request', 'agent_done', 'final_response']:
            assert evt in event_types, f"Missing ESS event: {evt}"

        docx_path = result.get('artifact_path')
        xlsx_path = result.get('excel_path')
        assert docx_path and os.path.isfile(docx_path), f"Missing docx: {docx_path}"
        assert xlsx_path and os.path.isfile(xlsx_path), f"Missing xlsx: {xlsx_path}"

        try:
            if docx_path and os.path.isfile(docx_path):
                os.remove(docx_path)
            if xlsx_path and os.path.isfile(xlsx_path):
                os.remove(xlsx_path)
        except OSError:
            pass

    def test_hitl_rejection_blocks_disk_writes(self):
        task_id = 'test_e2e_rejected'
        _hitl_decisions[task_id] = False
        evt = _hitl_events.setdefault(task_id, threading.Event())
        evt.set()

        emitted_events = []
        def mock_emit(event, payload):
            emitted_events.append((event, payload))

        prompt = 'Draft the Q3 corrosion-trend memo for MRPL Unit 200.'
        result = run_graph(
            task_id=task_id,
            prompt=prompt,
            route='agent_workflow',
            staging={},
            sse_emit=mock_emit,
        )

        assert result.get('hitl_approved') is False
        assert result.get('artifact_path') == ''
        assert not os.path.isfile(f'artifacts/{task_id}_memo.docx')
        assert not os.path.isfile(f'artifacts/{task_id}_calculations.xlsx')
