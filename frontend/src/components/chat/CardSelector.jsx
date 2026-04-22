import { useState, useMemo, useEffect, useRef } from "react";
import moviesData from "../../data/movies.json";
import directorsData from "../../data/directors.json";
import actorsData from "../../data/actors.json";
import { useCardData } from "../../hooks/useCardData";

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function createSeededRandom(seedValue) {
  let seed = 0;
  const text = String(seedValue || "deping");
  for (let index = 0; index < text.length; index += 1) {
    seed = (seed * 31 + text.charCodeAt(index)) >>> 0;
  }

  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function stableShuffle(items, seedValue) {
  const cloned = [...items];
  const random = createSeededRandom(seedValue);

  for (let index = cloned.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(random() * (index + 1));
    [cloned[index], cloned[nextIndex]] = [cloned[nextIndex], cloned[index]];
  }

  return cloned;
}

function normalizeMovieCard(card) {
  const rawId = String(card.id ?? card.tmdb_id ?? card.name);
  return {
    key: `movie:${rawId}`,
    id: rawId,
    name: card.name,
    poster_url: card.poster_url ?? null,
    movies: Array.isArray(card.movies) ? card.movies : card.name ? [card.name] : [],
    related: Array.isArray(card.related) ? card.related : [],
    raw: card,
  };
}

function mergePersonCards(type, localData, apiCards, apiLoading) {
  if (apiLoading || apiCards.length === 0) {
    return localData;
  }

  const apiPhotoById = new Map(
    apiCards
      .filter((card) => card?.id && card?.photo_url)
      .map((card) => [card.id, card.photo_url])
  );
  const apiPhotoByName = new Map(
    apiCards
      .filter((card) => card?.name && card?.photo_url)
      .map((card) => [normalizeName(card.name), card.photo_url])
  );

  return localData.map((card) => ({
    ...card,
    poster_url:
      apiPhotoById.get(card.tmdb_person_id) ||
      apiPhotoByName.get(normalizeName(card.name)) ||
      card.poster_url ||
      null,
  }));
}

function normalizePersonCard(type, card) {
  const rawId = String(card.id ?? card.tmdb_person_id ?? card.name);
  return {
    key: `${type}:${rawId}`,
    id: rawId,
    name: card.name,
    poster_url: card.poster_url ?? card.photo_url ?? null,
    movies: Array.isArray(card.movies) ? card.movies : [],
    related: Array.isArray(card.related) ? card.related : [],
    raw: card,
  };
}

function dedupeByKey(items) {
  return items.filter((item, index, allItems) => index === allItems.findIndex((candidate) => candidate.key === item.key));
}

function insertAfterSelected(items, selectedKey, newItems, limit = 70) {
  const selectedIndex = items.findIndex((item) => item.key === selectedKey);
  const dedupedNewItems = newItems.filter(
    (item, index, allItems) => index === allItems.findIndex((candidate) => candidate.key === item.key)
  );

  if (selectedIndex < 0) {
    return dedupeByKey([...items, ...dedupedNewItems]).slice(0, limit);
  }

  const before = items.slice(0, selectedIndex + 1);
  const after = items.slice(selectedIndex + 1).filter(
    (existing) => !dedupedNewItems.some((candidate) => candidate.key === existing.key)
  );

  return [...before, ...dedupedNewItems, ...after].slice(0, limit);
}

// type: 'movie' | 'director' | 'actor'
export default function CardSelector({ type, onComplete }) {
  const { cards: apiCards, loading: apiLoading } = useCardData(type);

  const movieCards = useMemo(
    () => dedupeByKey(moviesData.map(normalizeMovieCard).filter((card) => card.id)),
    []
  );
  const directorCards = useMemo(
    () => dedupeByKey(
      mergePersonCards("director", directorsData, apiCards, apiLoading)
        .map((card) => normalizePersonCard("director", card))
        .filter((card) => card.id)
    ),
    [apiCards, apiLoading]
  );
  const actorCards = useMemo(
    () => dedupeByKey(
      mergePersonCards("actor", actorsData, apiCards, apiLoading)
        .map((card) => normalizePersonCard("actor", card))
        .filter((card) => card.id)
    ),
    [apiCards, apiLoading]
  );

  const allData = useMemo(() => {
    const sourceItems = type === "movie" ? movieCards : type === "director" ? directorCards : type === "actor" ? actorCards : [];
    const seed = `${type}:${sourceItems.map((item) => item.key).join("|")}`;
    return stableShuffle(sourceItems, seed);
  }, [actorCards, directorCards, movieCards, type]);

  // 초기 노출: 상위 12개
  const [visibleItems, setVisibleItems] = useState(() => allData.slice(0, 12));
  const [selectedIds, setSelectedIds] = useState([]);
  const [newlyAddedIds, setNewlyAddedIds] = useState([]);
  const previousTypeRef = useRef(type);

  useEffect(() => {
    const nextItemsByKey = new Map(allData.map((item) => [item.key, item]));

    if (previousTypeRef.current !== type) {
      previousTypeRef.current = type;
      setVisibleItems(allData.slice(0, 12));
      setSelectedIds([]);
      setNewlyAddedIds([]);
      return;
    }

    setVisibleItems((prev) => {
      if (prev.length === 0) return allData.slice(0, 12);

      const refreshed = prev
        .map((item) => nextItemsByKey.get(item.key) ?? item)
        .filter(Boolean);

      return refreshed.length > 0 ? refreshed : allData.slice(0, 12);
    });
    setSelectedIds((prev) => prev.filter((key) => nextItemsByKey.has(key)));
    setNewlyAddedIds((prev) => prev.filter((key) => nextItemsByKey.has(key)));
  }, [allData, type]);

  const handleSelect = (item) => {
    const isSelected = selectedIds.includes(item.key);

    if (!isSelected) {
      setSelectedIds((prev) => [...prev, item.key]);

      // 연관 항목 추가 (아직 노출 안 된 것만, 선택 카드 바로 뒤에 3~5개 정도 노출)
      const currentKeys = visibleItems.map((i) => i.key);
      const toAdd = (item.related || [])
        .map((relatedId) => allData.find((candidate) => candidate.id === String(relatedId)))
        .filter(Boolean)
        .filter((relatedItem) => !currentKeys.includes(relatedItem.key))
        .slice(0, 5);

      if (toAdd.length > 0) {
        setNewlyAddedIds(toAdd.map((i) => i.key));
        setVisibleItems((prev) => insertAfterSelected(prev, item.key, toAdd, 70));
        setTimeout(() => setNewlyAddedIds([]), 600);
      }
    } else {
      setSelectedIds((prev) => prev.filter((id) => id !== item.key));
    }
  };

  const handleComplete = () => {
    const selected = visibleItems.filter((item) => selectedIds.includes(item.key));
    onComplete(selected.map((item) => item.name));
  };

  const unit = type === "movie" ? "편" : "명";

  return (
    <div style={{ width: "100%" }}>
      {/* 카드 그리드 */}
      <div
        className="hide-scrollbar"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 8,
          maxHeight: "55vh",
          overflowY: "auto",
          padding: 4,
        }}
      >
        {visibleItems.length >= 12 && (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: "6px 0 2px",
              fontSize: 11,
              color: "var(--color-on-surface-variant)",
              opacity: 0.5,
            }}
          >
            선택할수록 더 많은 추천이 나타나요 ✨
          </div>
        )}
        {visibleItems.map((item) => {
          const isSelected = selectedIds.includes(item.key);
          const isNew = newlyAddedIds.includes(item.key);

          return (
            <div
              key={item.key}
              onClick={() => handleSelect(item)}
              className={isNew ? "card-slide-in" : ""}
              style={{
                cursor: "pointer",
                borderRadius: 12,
                overflow: "hidden",
                padding: 3,
                background: isSelected
                  ? "linear-gradient(180deg, rgba(142,0,4,0.92) 0%, rgba(142,0,4,0.72) 100%)"
                  : "var(--color-surface)",
                transition: "transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease",
                transform: isSelected ? "scale(0.96)" : undefined,
                boxShadow: isSelected
                  ? "0 18px 36px -10px rgba(142, 0, 4, 0.38)"
                  : "none",
                userSelect: "none",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) e.currentTarget.style.transform = "scale(1.04)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = isSelected ? "scale(0.95)" : "scale(1)";
              }}
            >
              <div style={{ position: "relative" }}>
                {isSelected ? (
                  <div
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      zIndex: 2,
                      padding: "4px 7px",
                      borderRadius: 999,
                      background: "rgba(142,0,4,0.92)",
                      color: "white",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.02em",
                      boxShadow: "0 10px 20px -10px rgba(0,0,0,0.45)",
                    }}
                  >
                    선택됨
                  </div>
                ) : null}

                <img
                  src={item.poster_url || "/placeholder.jpg"}
                  alt={item.name}
                  style={{
                    width: "100%",
                    aspectRatio: "2 / 3",
                    objectFit: "cover",
                    objectPosition: "top",
                    display: "block",
                    background: "var(--color-surface-container)",
                  }}
                  onError={(e) => {
                    e.target.src = "/placeholder.jpg";
                  }}
                />
                <div
                  style={{
                    padding: "5px 4px 6px",
                    background: "var(--color-surface-container-lowest)",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--color-on-surface)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.name}
                  </p>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: 10,
                      color: "var(--color-on-surface-variant)",
                      opacity: 0.6,
                    }}
                  >
                    {item.movies.length}{unit}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 선택 완료 버튼 */}
      <button
        onClick={handleComplete}
        disabled={selectedIds.length === 0}
        style={{
          marginTop: 12,
          width: "100%",
          padding: "9px 0",
          borderRadius: 20,
          border: "none",
          fontSize: 13,
          fontWeight: 600,
          cursor: selectedIds.length > 0 ? "pointer" : "not-allowed",
          background: selectedIds.length > 0
            ? "var(--color-primary)"
            : "var(--color-surface-container-highest)",
          color: selectedIds.length > 0
            ? "var(--color-on-primary)"
            : "var(--color-on-surface-variant)",
          opacity: selectedIds.length > 0 ? 1 : 0.55,
          transition: "background 0.2s, opacity 0.2s",
        }}
      >
        {selectedIds.length > 0
          ? `${selectedIds.length}${unit} 선택 완료`
          : "선택해주세요"}
      </button>
    </div>
  );
}
