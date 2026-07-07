package com.myzubster.models

data class Skill(
    val id: String,
    val title: String,
    val category: String,
    val description: String,
    val price: Double? = null,
    val location: String? = null,
    val userId: String,
    val createdAt: String,
    val updatedAt: String? = null
)

data class SkillsResponse(
    val success: Boolean,
    val data: List<Skill> = emptyList(),
    val pagination: Pagination? = null,
    val error: String? = null
)

data class CreateSkillRequest(
    val title: String,
    val category: String,
    val description: String,
    val price: Double? = null,
    val location: String? = null
)

data class UpdateSkillRequest(
    val title: String? = null,
    val category: String? = null,
    val description: String? = null,
    val price: Double? = null,
    val location: String? = null
)

data class SkillResponse(
    val success: Boolean,
    val data: Skill? = null,
    val error: String? = null
)

data class SkillCategoriesResponse(
    val success: Boolean,
    val data: List<String> = emptyList(),
    val error: String? = null
)