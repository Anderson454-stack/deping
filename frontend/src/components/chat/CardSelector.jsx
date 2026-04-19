import { useState, useMemo, useEffect } from "react";
import moviesData from "../../data/movies.json";
import directorsData from "../../data/directors.json";
import actorsData from "../../data/actors.json";
import { useCardData } from "../../hooks/useCardData";

// type: 'movie' | 'director' | 'actor'
export default function CardSelector({ type, onComplete }) {
  const { cards: apiCards, loading: apiLoading } = useCardData(type);

  const allData = useMemo(() => {
    if (type === "movie") return moviesData;

    const localData = type === "director" ? directorsData : actorsData;
    if (apiLoading || apiCards.length === 0) return localData;

    // 배우/감독 목록 자체는 로컬 JSON을 기준으로 유지하고,
    // API는 매칭되는 인물의 사진만 보강한다.
    const normalizeName = (value) => String(value || '').trim().toLowerCase();
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
  }, [type, apiCards, apiLoading]);

  // 초기 노출: 상위 12개
  const [visibleItems, setVisibleItems] = useState(() => allData.slice(0, 12));
  const [selectedIds, setSelectedIds] = useState([]);
  const [newlyAddedIds, setNewlyAddedIds] = useState([]);

  // API 데이터가 로드되면 visibleItems 갱신 (director/actor)
  useEffect(() => {
    setVisibleItems(allData.slice(0, 12));
    setSelectedIds([]);
  }, [allData]);

  const handleSelect = (item) => {
    const isSelected = selectedIds.includes(item.id);

    if (!isSelected) {
      setSelectedIds((prev) => [...prev, item.id]);

      // 연관 항목 추가 (아직 노출 안 된 것만, 최대 4개)
      const currentIds = visibleItems.map((i) => i.id);
      const toAdd = (item.related || [])
        .filter((relatedId) => !currentIds.includes(relatedId))
        .map((relatedId) => allData.find((i) => i.id === relatedId))
        .filter(Boolean)
        .slice(0, 6);

      if (toAdd.length > 0) {
        setNewlyAddedIds(toAdd.map((i) => i.id));
        setVisibleItems((prev) => [...prev, ...toAdd].slice(0, 70));
        setTimeout(() => setNewlyAddedIds([]), 600);
      }
    } else {
      setSelectedIds((prev) => prev.filter((id) => id !== item.id));
    }
  };

  const handleComplete = () => {
    const selected = visibleItems.filter((i) => selectedIds.includes(i.id));
    onComplete(selected.map((i) => i.name));
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
          const isSelected = selectedIds.includes(item.id);
          const isNew = newlyAddedIds.includes(item.id);

          return (
            <div
              key={item.id}
              onClick={() => handleSelect(item)}
              className={isNew ? "card-slide-in" : ""}
              style={{
                cursor: "pointer",
                borderRadius: 12,
                overflow: "hidden",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                transform: isSelected ? "scale(0.95)" : undefined,
                boxShadow: isSelected ? "var(--shadow-cinematic)" : "none",
                outline: isSelected ? "2.5px solid var(--color-primary)" : "2.5px solid transparent",
                outlineOffset: 2,
                userSelect: "none",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) e.currentTarget.style.transform = "scale(1.04)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = isSelected ? "scale(0.95)" : "scale(1)";
              }}
            >
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
