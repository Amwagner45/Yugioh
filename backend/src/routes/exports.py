"""
API routes for file exports management
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from typing import List, Dict, Any

router = APIRouter()


@router.get("/binder-files")
async def list_binder_files():
    """Get list of all exported binder CSV files"""
    try:
        from ..services.file_export import file_export_service

        files = file_export_service.list_binder_files()
        return {"success": True, "files": files, "count": len(files)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/deck-files")
async def list_deck_files():
    """Get list of all exported deck files (YDK and JSON)"""
    try:
        from ..services.file_export import file_export_service

        files = file_export_service.list_deck_files()
        return {"success": True, "files": files, "count": len(files)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/all-files")
async def list_all_exported_files():
    """Get list of all exported files (binders and decks)"""
    try:
        from ..services.file_export import file_export_service

        binder_files = file_export_service.list_binder_files()
        deck_files = file_export_service.list_deck_files()

        # Add type to distinguish file types
        for file in binder_files:
            file["type"] = "binder"
        for file in deck_files:
            file["type"] = "deck"

        all_files = binder_files + deck_files
        all_files.sort(
            key=lambda x: x["modified"], reverse=True
        )  # Sort by modification date

        return {
            "success": True,
            "files": all_files,
            "summary": {
                "total_files": len(all_files),
                "binder_files": len(binder_files),
                "deck_files": len(deck_files),
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/refresh-binder/{binder_uuid}")
async def refresh_binder_export(binder_uuid: str):
    """Manually trigger export for a specific binder"""
    try:
        from ..database.models import Binder
        from ..services.file_export import file_export_service

        binder = Binder.get_by_uuid(binder_uuid)
        if not binder:
            raise HTTPException(status_code=404, detail="Binder not found")

        file_path = file_export_service.save_binder_as_csv(binder)
        if file_path:
            return {
                "success": True,
                "message": f"Binder '{binder.name}' exported successfully",
                "file_path": file_path,
            }
        else:
            return {"success": False, "message": "Failed to export binder"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/refresh-deck/{deck_uuid}")
async def refresh_deck_export(deck_uuid: str):
    """Manually trigger export for a specific deck"""
    try:
        from ..database.models import Deck
        from ..services.file_export import file_export_service

        deck = Deck.get_by_uuid(deck_uuid)
        if not deck:
            raise HTTPException(status_code=404, detail="Deck not found")

        ydk_path = file_export_service.save_deck_as_ydk(deck)
        json_path = file_export_service.save_deck_as_json(deck)

        if ydk_path or json_path:
            return {
                "success": True,
                "message": f"Deck '{deck.name}' exported successfully",
                "files": {"ydk_path": ydk_path, "json_path": json_path},
            }
        else:
            return {"success": False, "message": "Failed to export deck"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/refresh-all")
async def refresh_all_exports():
    """Manually trigger export for all binders and decks"""
    try:
        from ..database.models import Binder, Deck
        from ..services.file_export import file_export_service

        results = {
            "success": True,
            "binders": {"processed": 0, "exported": 0, "failed": 0},
            "decks": {"processed": 0, "exported": 0, "failed": 0},
            "errors": [],
        }

        # Export all binders
        try:
            binders = Binder.get_by_user(user_id=1)
            for binder in binders:
                results["binders"]["processed"] += 1
                try:
                    file_path = file_export_service.save_binder_as_csv(binder)
                    if file_path:
                        results["binders"]["exported"] += 1
                    else:
                        results["binders"]["failed"] += 1
                        results["errors"].append(
                            f"Failed to export binder '{binder.name}'"
                        )
                except Exception as e:
                    results["binders"]["failed"] += 1
                    results["errors"].append(
                        f"Error exporting binder '{binder.name}': {str(e)}"
                    )
        except Exception as e:
            results["errors"].append(f"Error processing binders: {str(e)}")

        # Export all decks
        try:
            decks = Deck.get_by_user(user_id=1)
            for deck in decks:
                results["decks"]["processed"] += 1
                try:
                    ydk_path = file_export_service.save_deck_as_ydk(deck)
                    json_path = file_export_service.save_deck_as_json(deck)
                    if ydk_path or json_path:
                        results["decks"]["exported"] += 1
                    else:
                        results["decks"]["failed"] += 1
                        results["errors"].append(f"Failed to export deck '{deck.name}'")
                except Exception as e:
                    results["decks"]["failed"] += 1
                    results["errors"].append(
                        f"Error exporting deck '{deck.name}': {str(e)}"
                    )
        except Exception as e:
            results["errors"].append(f"Error processing decks: {str(e)}")

        # Overall success if no failures
        if results["binders"]["failed"] > 0 or results["decks"]["failed"] > 0:
            results["success"] = False

        return results

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cleanup")
async def cleanup_old_files(max_age_days: int = 30):
    """Clean up old exported files"""
    try:
        from ..services.file_export import file_export_service

        # Get file counts before cleanup
        binder_files_before = len(file_export_service.list_binder_files())
        deck_files_before = len(file_export_service.list_deck_files())

        # Perform cleanup
        file_export_service.cleanup_old_files(max_age_days)

        # Get file counts after cleanup
        binder_files_after = len(file_export_service.list_binder_files())
        deck_files_after = len(file_export_service.list_deck_files())

        return {
            "success": True,
            "message": f"Cleaned up files older than {max_age_days} days",
            "cleanup_summary": {
                "binder_files_removed": binder_files_before - binder_files_after,
                "deck_files_removed": deck_files_before - deck_files_after,
                "files_remaining": {
                    "binder_files": binder_files_after,
                    "deck_files": deck_files_after,
                },
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export-status")
async def get_export_status():
    """Get overall export status and statistics"""
    try:
        from ..database.models import Binder, Deck
        from ..services.file_export import file_export_service

        # Get database counts
        binders_in_db = len(Binder.get_by_user(user_id=1))
        decks_in_db = len(Deck.get_by_user(user_id=1))

        # Get file counts
        binder_files = file_export_service.list_binder_files()
        deck_files = file_export_service.list_deck_files()

        # Calculate total file sizes
        total_binder_size = sum(f["size"] for f in binder_files)
        total_deck_size = sum(f["size"] for f in deck_files)

        return {
            "success": True,
            "export_status": {
                "database_items": {"binders": binders_in_db, "decks": decks_in_db},
                "exported_files": {
                    "binder_files": len(binder_files),
                    "deck_files": len(deck_files),
                    "total_files": len(binder_files) + len(deck_files),
                },
                "storage_usage": {
                    "binder_files_size": total_binder_size,
                    "deck_files_size": total_deck_size,
                    "total_size": total_binder_size + total_deck_size,
                    "human_readable": {
                        "binder_files": (
                            f"{total_binder_size / 1024:.1f} KB"
                            if total_binder_size > 0
                            else "0 B"
                        ),
                        "deck_files": (
                            f"{total_deck_size / 1024:.1f} KB"
                            if total_deck_size > 0
                            else "0 B"
                        ),
                        "total": (
                            f"{(total_binder_size + total_deck_size) / 1024:.1f} KB"
                            if (total_binder_size + total_deck_size) > 0
                            else "0 B"
                        ),
                    },
                },
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
