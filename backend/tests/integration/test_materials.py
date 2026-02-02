"""
Integration tests for materials endpoints.
"""
import pytest
from fastapi import status


def test_create_material(client, auth_headers):
    """Test creating a material."""
    response = client.post(
        "/api/materials",
        headers=auth_headers,
        json={
            "name": "Test Sales Deck",
            "material_type": "sales_deck",
            "audience": "customer_facing",
            "universe_name": "Public Cloud",
            "product_name": "Compute",
            "status": "draft"
        }
    )
    
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["name"] == "Test Sales Deck"
    assert data["material_type"] == "sales_deck"
    assert data["universe_name"] == "Public Cloud"
    assert "id" in data


def test_create_material_unauthorized(client):
    """Test creating material without authentication."""
    response = client.post(
        "/api/materials",
        json={
            "name": "Test Material",
            "material_type": "sales_deck",
            "audience": "customer_facing"
        }
    )
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_list_materials(client, auth_headers):
    """Test listing materials."""
    # Create a material first
    client.post(
        "/api/materials",
        headers=auth_headers,
        json={
            "name": "Test Material",
            "material_type": "sales_deck",
            "audience": "customer_facing"
        }
    )
    
    # List materials
    response = client.get(
        "/api/materials",
        headers=auth_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0


def test_get_material(client, auth_headers):
    """Test getting a single material."""
    # Create material
    create_response = client.post(
        "/api/materials",
        headers=auth_headers,
        json={
            "name": "Test Material",
            "material_type": "sales_deck",
            "audience": "customer_facing"
        }
    )
    material_id = create_response.json()["id"]
    
    # Get material
    response = client.get(
        f"/api/materials/{material_id}",
        headers=auth_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == material_id
    assert data["name"] == "Test Material"


def test_update_material(client, auth_headers):
    """Test updating a material."""
    # Create material
    create_response = client.post(
        "/api/materials",
        headers=auth_headers,
        json={
            "name": "Original Name",
            "material_type": "sales_deck",
            "audience": "customer_facing"
        }
    )
    material_id = create_response.json()["id"]
    
    # Update material
    response = client.put(
        f"/api/materials/{material_id}",
        headers=auth_headers,
        json={
            "name": "Updated Name",
            "material_type": "sales_deck",
            "audience": "customer_facing",
            "status": "published"
        }
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["name"] == "Updated Name"
    assert data["status"] == "published"


def test_delete_material(client, auth_headers):
    """Test deleting a material."""
    # Create material
    create_response = client.post(
        "/api/materials",
        headers=auth_headers,
        json={
            "name": "To Delete",
            "material_type": "sales_deck",
            "audience": "customer_facing"
        }
    )
    material_id = create_response.json()["id"]
    
    # Delete material
    response = client.delete(
        f"/api/materials/{material_id}",
        headers=auth_headers
    )
    
    assert response.status_code == status.HTTP_204_NO_CONTENT
    
    # Verify deleted
    get_response = client.get(
        f"/api/materials/{material_id}",
        headers=auth_headers
    )
    assert get_response.status_code == status.HTTP_404_NOT_FOUND


def test_filter_materials_by_universe(client, auth_headers):
    """Test filtering materials by universe."""
    # Create materials in different universes
    client.post(
        "/api/materials",
        headers=auth_headers,
        json={
            "name": "Public Cloud Material",
            "material_type": "sales_deck",
            "audience": "customer_facing",
            "universe_name": "Public Cloud"
        }
    )
    client.post(
        "/api/materials",
        headers=auth_headers,
        json={
            "name": "Private Cloud Material",
            "material_type": "sales_deck",
            "audience": "customer_facing",
            "universe_name": "Private Cloud"
        }
    )
    
    # Filter by universe
    response = client.get(
        "/api/materials?universe_name=Public Cloud",
        headers=auth_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert all(m["universe_name"] == "Public Cloud" for m in data)
