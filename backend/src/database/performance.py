"""
Database performance optimization utilities
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
import time
from ..database import get_db_connection


class DatabasePerformance:
    """Utility class for database performance monitoring and optimization"""

    @staticmethod
    def analyze_query_performance(query: str, params: tuple = ()) -> Dict[str, Any]:
        """Analyze query performance and return execution statistics"""
        with get_db_connection() as conn:
            # Enable query plan analysis
            conn.execute("PRAGMA query_only = ON")

            start_time = time.time()

            # Explain query plan
            explain_cursor = conn.execute(f"EXPLAIN QUERY PLAN {query}", params)
            query_plan = explain_cursor.fetchall()

            # Execute query and measure time
            conn.execute("PRAGMA query_only = OFF")

            start_exec_time = time.time()
            cursor = conn.execute(query, params)
            results = cursor.fetchall()
            end_exec_time = time.time()

            execution_time = end_exec_time - start_exec_time

            return {
                "query": query,
                "execution_time_ms": round(execution_time * 1000, 2),
                "result_count": len(results),
                "query_plan": [dict(row) for row in query_plan],
                "timestamp": datetime.now().isoformat(),
            }

    @staticmethod
    def get_database_statistics() -> Dict[str, Any]:
        """Get general database statistics"""
        with get_db_connection() as conn:
            stats = {}

            # Table row counts
            tables = [
                "users",
                "binders",
                "binder_cards",
                "decks",
                "deck_cards",
                "card_cache",
                "card_sets",
            ]
            for table in tables:
                cursor = conn.execute(f"SELECT COUNT(*) FROM {table}")
                stats[f"{table}_count"] = cursor.fetchone()[0]

            # Database size
            cursor = conn.execute("PRAGMA page_count")
            page_count = cursor.fetchone()[0]
            cursor = conn.execute("PRAGMA page_size")
            page_size = cursor.fetchone()[0]
            stats["database_size_bytes"] = page_count * page_size

            # Index information
            cursor = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='index' AND sql IS NOT NULL"
            )
            stats["index_count"] = len(cursor.fetchall())

            # Cache hit ratio (if available)
            cursor = conn.execute("PRAGMA cache_size")
            stats["cache_size"] = cursor.fetchone()[0]

            return stats

    @staticmethod
    def get_slow_queries(min_execution_time_ms: float = 100) -> List[Dict[str, Any]]:
        """Get list of potentially slow queries (would need query logging enabled)"""
        # This would require query logging to be implemented
        # For now, return common potentially slow query patterns
        slow_query_patterns = [
            {
                "pattern": "SELECT * FROM card_cache WHERE name LIKE '%?%'",
                "description": "Full text search without index",
                "suggestion": "Consider using FTS or more specific indexes",
            },
            {
                "pattern": "SELECT * FROM binder_cards WHERE binder_id = ? ORDER BY card_name",
                "description": "Sorting by non-indexed field",
                "suggestion": "Add index on commonly sorted fields",
            },
            {
                "pattern": "SELECT * FROM deck_cards WHERE deck_id = ? AND section = ?",
                "description": "Multi-condition query",
                "suggestion": "Consider composite index on (deck_id, section)",
            },
        ]
        return slow_query_patterns

    @staticmethod
    def optimize_database() -> Dict[str, Any]:
        """Run database optimization commands"""
        with get_db_connection() as conn:
            results = {}

            # Analyze database
            start_time = time.time()
            conn.execute("ANALYZE")
            results["analyze_time_ms"] = round((time.time() - start_time) * 1000, 2)

            # Vacuum database (reclaim space)
            start_time = time.time()
            conn.execute("VACUUM")
            results["vacuum_time_ms"] = round((time.time() - start_time) * 1000, 2)

            # Reindex
            start_time = time.time()
            conn.execute("REINDEX")
            results["reindex_time_ms"] = round((time.time() - start_time) * 1000, 2)

            return results

    @staticmethod
    def suggest_indexes(table_name: str = None) -> List[Dict[str, str]]:
        """Suggest additional indexes based on common query patterns"""
        suggestions = []

        if table_name is None or table_name == "card_cache":
            suggestions.extend(
                [
                    {
                        "table": "card_cache",
                        "columns": "type, attribute",
                        "reason": "Common filtering combination in card search",
                        "sql": "CREATE INDEX idx_card_cache_type_attribute ON card_cache(type, attribute)",
                    },
                    {
                        "table": "card_cache",
                        "columns": "race, level",
                        "reason": "Monster filtering by race and level",
                        "sql": "CREATE INDEX idx_card_cache_race_level ON card_cache(race, level)",
                    },
                ]
            )

        if table_name is None or table_name == "binder_cards":
            suggestions.extend(
                [
                    {
                        "table": "binder_cards",
                        "columns": "card_id, binder_id",
                        "reason": "Checking card availability in binder",
                        "sql": "CREATE INDEX idx_binder_cards_card_binder ON binder_cards(card_id, binder_id)",
                    }
                ]
            )

        if table_name is None or table_name == "deck_cards":
            suggestions.extend(
                [
                    {
                        "table": "deck_cards",
                        "columns": "section, order_index",
                        "reason": "Ordering cards within deck sections",
                        "sql": "CREATE INDEX idx_deck_cards_section_order ON deck_cards(section, order_index)",
                    }
                ]
            )

        return suggestions

    @staticmethod
    def check_index_usage() -> List[Dict[str, Any]]:
        """Check which indexes are being used effectively"""
        with get_db_connection() as conn:
            # Get all indexes
            cursor = conn.execute(
                """
                SELECT name, tbl_name, sql 
                FROM sqlite_master 
                WHERE type = 'index' AND sql IS NOT NULL
                ORDER BY tbl_name, name
            """
            )
            indexes = cursor.fetchall()

            index_info = []
            for index in indexes:
                index_name, table_name, sql = index

                # This is a simplified check - in a real implementation,
                # you'd need query log analysis to determine actual usage
                info = {
                    "index_name": index_name,
                    "table_name": table_name,
                    "sql": sql,
                    "estimated_usefulness": "Unknown - requires query log analysis",
                }
                index_info.append(info)

            return index_info


class QueryProfiler:
    """Context manager for profiling database queries"""

    def __init__(self, query_name: str):
        self.query_name = query_name
        self.start_time = None

    def __enter__(self):
        self.start_time = time.time()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.start_time:
            execution_time = time.time() - self.start_time
            print(f"Query '{self.query_name}' executed in {execution_time*1000:.2f}ms")


# Example usage:
# with QueryProfiler("Get binder cards"):
#     cards = binder.get_cards()
