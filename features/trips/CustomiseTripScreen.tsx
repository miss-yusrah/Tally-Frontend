"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { ChevronDown, Clock } from "lucide-react";
import {
  AuthBackButton,
  AuthBody,
  AuthField,
  AuthPrimaryButton,
  AuthStackHeader,
  AuthStackScreen,
  useAuthSession,
} from "@/features/auth";
import { HomeProfileAvatarLink } from "@/features/home";
import { GROUP_DETAIL_ICONS } from "@/features/groups/groupDetailStyles";
import {
  useAddToast,
  useCreatedTripDraftStore,
  useTripStore,
  useTrips,
} from "@/store";
import { cn } from "@/lib/utils";
import { type CustomiseTripFormData } from "./schemas";
import { lazyZodResolver } from "@/lib/forms/lazyZodResolver";
import {
  getExploreDestinationById,
  getExploreDestinationDetailImage,
} from "./mockExploreDestinations";
import {
  MOCK_SELECT_GROUPS,
  tripsToSelectGroupViews,
  type SelectGroupView,
} from "./mockSelectGroups";
import { TripDatePicker, formatCustomiseTripDate } from "./TripDatePicker";
import { TripTimePicker, formatTripTimeField } from "./TripTimePicker";
import { getPlaceAddress } from "./outingFormat";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5921B5] focus-visible:ring-offset-2 focus-visible:ring-offset-white";

/** Figma customise-trip input — 40px pill, #E5E5E5 */
const fieldClass = cn(
  "flex min-h-[40px] w-full items-center gap-2 self-stretch",
  "rounded-full border border-[#E5E5E5] bg-white px-4 py-[9.5px]",
  "text-[16px] font-normal leading-none text-[#15131A]",
  "shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
  "appearance-none outline-none",
  "placeholder:font-normal placeholder:text-[#C7C7CC]",
  "focus:border-[#5921B5] focus:outline-none focus:ring-2 focus:ring-[#5921B5]/20"
);

function defaultTripName(placeName: string): string {
  if (/cafe|coffee/i.test(placeName)) return "Coffee date";
  return placeName;
}

function GroupPickerMenu({
  groups,
  selectedId,
  onSelect,
  onClose,
  containerRef,
}: {
  groups: SelectGroupView[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  containerRef: RefObject<HTMLElement | null>;
}) {
  const panelRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [onClose, containerRef]);

  return (
    <ul
      ref={panelRef}
      role="listbox"
      className={cn(
        "absolute z-20 mt-2 max-h-56 w-full overflow-y-auto",
        "rounded-2xl border border-[#E5E5E5] bg-white py-1",
        "shadow-[0_8px_24px_rgba(21,19,26,0.08)]"
      )}
    >
      {groups.map((group) => {
        const selected = group.id === selectedId;
        return (
          <li key={group.id}>
            <button
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => onSelect(group.id)}
              className={cn(
                "flex w-full items-center px-4 py-3 text-left text-[16px]",
                "text-[#15131A] transition-colors hover:bg-[#F9FAFB]",
                selected && "bg-[#F5F3FF] font-medium"
              )}
            >
              {group.name}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

interface CustomiseTripScreenProps {
  /** Group the user came from (back navigation). */
  entryGroupId: string;
  placeId: string;
  /** Group chosen on “Who’s coming?” */
  selectedGroupId: string;
}

/**
 * Add-trip flow — Customise your trip form (+ inline date calendar).
 * Mock-only create until the backend accepts itinerary trips.
 */
export function CustomiseTripScreen({
  entryGroupId,
  placeId,
  selectedGroupId,
}: CustomiseTripScreenProps) {
  const router = useRouter();
  const { user } = useAuthSession();
  const addToast = useAddToast();
  const setDraft = useCreatedTripDraftStore((s) => s.setDraft);
  const trips = useTrips();
  const fetchTrips = useTripStore((s) => s.fetchTrips);
  const [groupOpen, setGroupOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const groupFieldRef = useRef<HTMLDivElement>(null);
  const dateFieldRef = useRef<HTMLDivElement>(null);
  const timeFieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.onboardingComplete) return;
    void fetchTrips(user);
  }, [user, fetchTrips]);

  const selectableGroups = useMemo(() => {
    if (trips.length > 0) return tripsToSelectGroupViews(trips);
    return MOCK_SELECT_GROUPS;
  }, [trips]);

  const place = getExploreDestinationById(placeId);
  const initialGroup = useMemo(() => {
    return (
      selectableGroups.find((g) => g.id === selectedGroupId) ??
      selectableGroups.find((g) => g.id === entryGroupId) ??
      selectableGroups[0] ??
      MOCK_SELECT_GROUPS[0]
    );
  }, [selectableGroups, selectedGroupId, entryGroupId]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<CustomiseTripFormData>({
    resolver: lazyZodResolver<CustomiseTripFormData>(
      () => import("./schemas").then((m) => m.customiseTripSchema)
    ),
    mode: "onChange",
    defaultValues: {
      name: defaultTripName(place?.name ?? "Trip"),
      groupId: initialGroup.id,
      location: place?.name ?? "",
      date: "",
      time: "10:30",
    },
  });

  const groupId = watch("groupId");
  const date = watch("date");
  const time = watch("time");
  const selectedGroup: SelectGroupView | undefined = useMemo(
    () => selectableGroups.find((g) => g.id === groupId) ?? initialGroup,
    [selectableGroups, groupId, initialGroup]
  );

  useEffect(() => {
    if (!place) return;
    setValue("location", place.name, { shouldValidate: true });
  }, [place, setValue]);

  useEffect(() => {
    if (!selectedGroupId) return;
    if (selectableGroups.some((g) => g.id === selectedGroupId)) {
      setValue("groupId", selectedGroupId, { shouldValidate: true });
    }
  }, [selectedGroupId, selectableGroups, setValue]);

  const onSubmit = (data: CustomiseTripFormData) => {
    if (!user) {
      addToast({ message: "You need to be signed in.", variant: "error" });
      return;
    }

    const targetGroupId = data.groupId || entryGroupId;
    const group =
      selectableGroups.find((g) => g.id === targetGroupId) ?? initialGroup;
    const outingId = `outing-${Date.now()}`;
    const placeImage = place
      ? getExploreDestinationDetailImage(place)
      : "/tabr/Trip cards/trip location.webp";

    setDraft({
      id: outingId,
      name: data.name.trim(),
      groupId: targetGroupId,
      groupName: group?.name ?? "Your group",
      friendCount: group?.friendCount ?? 1,
      avatarSrcs: group?.avatarSrcs ?? [],
      placeId,
      placeName: place?.name ?? data.location.trim(),
      area: place?.area ?? "",
      city: place?.city ?? "Lagos",
      rating: place?.rating ?? 4.5,
      reviewCount: place?.reviewCount ?? 0,
      priceLabel: place?.priceLabel ?? "",
      imageSrc: placeImage,
      date: data.date,
      time: data.time,
      address: getPlaceAddress(placeId, data.location.trim()),
    });

    // Outing details + trip-created overlay (same group id as draft).
    router.push(`/trips/${targetGroupId}/outings/${outingId}?created=1`);
  };

  // Primary flow skips “Who’s coming?” — back goes to location details.
  const backHref = `/trips/${entryGroupId}/trips/new/${placeId}`;

  return (
    <AuthStackScreen>
      <div className="flex items-center justify-between">
        <AuthBackButton href={backHref} label="Back to groups" />
        <HomeProfileAvatarLink avatarUrl={user?.avatarUrl} />
      </div>

      <AuthStackHeader
        title="Customise your trip"
        subtitle="Let’s make the experience yours"
      />

      <AuthBody className="flex-1">
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="flex w-full min-w-0 flex-1 flex-col"
        >
          <div className="flex w-full min-w-0 flex-col gap-5">
            <AuthField
              label="Trip name"
              htmlFor="trip-name"
              error={errors.name?.message}
            >
              <input
                id="trip-name"
                autoComplete="off"
                className={cn(
                  fieldClass,
                  errors.name && "border-[#F43F5E]",
                  focusRing
                )}
                {...register("name")}
              />
            </AuthField>

            <div ref={groupFieldRef} className="relative w-full min-w-0">
              <AuthField
                label="Group"
                htmlFor="trip-group"
                error={errors.groupId?.message}
              >
                <Controller
                  name="groupId"
                  control={control}
                  render={() => (
                    <button
                      type="button"
                      id="trip-group"
                      aria-haspopup="listbox"
                      aria-expanded={groupOpen}
                      onClick={() => {
                        setDateOpen(false);
                        setTimeOpen(false);
                        setGroupOpen((open) => !open);
                      }}
                      className={cn(
                        fieldClass,
                        "justify-between text-left",
                        errors.groupId && "border-[#F43F5E]",
                        focusRing
                      )}
                    >
                      <span
                        className={cn(
                          "truncate",
                          selectedGroup ? "text-[#15131A]" : "text-[#C7C7CC]"
                        )}
                      >
                        {selectedGroup?.name ?? "Select group"}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-[18px] w-[18px] shrink-0 text-[#8E8E93] transition-transform",
                          groupOpen && "rotate-180"
                        )}
                        strokeWidth={1.75}
                      />
                    </button>
                  )}
                />
              </AuthField>

              {groupOpen ? (
                <GroupPickerMenu
                  groups={selectableGroups}
                  selectedId={groupId}
                  containerRef={groupFieldRef}
                  onSelect={(id) => {
                    setValue("groupId", id, {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                    setGroupOpen(false);
                  }}
                  onClose={() => setGroupOpen(false)}
                />
              ) : null}
            </div>

            <AuthField
              label="Location"
              htmlFor="trip-location"
              error={errors.location?.message}
            >
              <input
                id="trip-location"
                autoComplete="off"
                className={cn(
                  fieldClass,
                  errors.location && "border-[#F43F5E]",
                  focusRing
                )}
                {...register("location")}
              />
            </AuthField>

            <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-3">
              <div ref={dateFieldRef} className="relative min-w-0">
                <AuthField
                  label="Date"
                  htmlFor="trip-date"
                  error={errors.date?.message}
                >
                  <Controller
                    name="date"
                    control={control}
                    render={() => (
                      <button
                        type="button"
                        id="trip-date"
                        aria-haspopup="dialog"
                        aria-expanded={dateOpen}
                        onClick={() => {
                          setGroupOpen(false);
                          setTimeOpen(false);
                          setDateOpen((open) => !open);
                        }}
                        className={cn(
                          fieldClass,
                          "justify-between gap-1.5 px-3 text-left",
                          errors.date && "border-[#F43F5E]",
                          focusRing
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-1.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={GROUP_DETAIL_ICONS.calendar}
                            alt=""
                            width={14}
                            height={14}
                            className="h-3.5 w-3.5 shrink-0"
                            aria-hidden
                          />
                          <span
                            className={cn(
                              "truncate text-[14px] leading-none xs:text-[15px] sm:text-[16px]",
                              date ? "text-[#15131A]" : "text-[#C7C7CC]"
                            )}
                          >
                            {date ? formatCustomiseTripDate(date) : "Pick a date"}
                          </span>
                        </span>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 text-[#8E8E93] transition-transform",
                            dateOpen && "rotate-180"
                          )}
                          strokeWidth={1.75}
                        />
                      </button>
                    )}
                  />
                </AuthField>

                {dateOpen ? (
                  <div className="absolute left-0 right-0 z-20 mt-2 sm:right-auto sm:w-[min(100vw-2.5rem,320px)]">
                    <TripDatePicker
                      selectedDate={date || undefined}
                      containerRef={dateFieldRef}
                      onSelect={(iso) =>
                        setValue("date", iso, {
                          shouldValidate: true,
                          shouldDirty: true,
                        })
                      }
                      onClose={() => setDateOpen(false)}
                    />
                  </div>
                ) : null}
              </div>

              <div ref={timeFieldRef} className="relative min-w-0">
                <AuthField
                  label="Time"
                  htmlFor="trip-time"
                  error={errors.time?.message}
                >
                  <Controller
                    name="time"
                    control={control}
                    render={() => (
                      <button
                        type="button"
                        id="trip-time"
                        aria-haspopup="dialog"
                        aria-expanded={timeOpen}
                        onClick={() => {
                          setGroupOpen(false);
                          setDateOpen(false);
                          setTimeOpen((open) => !open);
                        }}
                        className={cn(
                          fieldClass,
                          "justify-between gap-1.5 px-3 text-left",
                          errors.time && "border-[#F43F5E]",
                          focusRing
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-1.5">
                          <Clock
                            className="h-3.5 w-3.5 shrink-0 text-[#716D7D]"
                            strokeWidth={1.75}
                            aria-hidden
                          />
                          <span
                            className={cn(
                              "truncate text-[14px] leading-none xs:text-[15px]",
                              time ? "text-[#15131A]" : "text-[#C7C7CC]"
                            )}
                          >
                            {time ? formatTripTimeField(time) : "Pick a time"}
                          </span>
                        </span>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 text-[#8E8E93] transition-transform",
                            timeOpen && "rotate-180"
                          )}
                          strokeWidth={1.75}
                        />
                      </button>
                    )}
                  />
                </AuthField>

                {timeOpen ? (
                  <div className="absolute right-0 z-20 mt-2 w-[min(100vw-2.5rem,280px)]">
                    <TripTimePicker
                      value={time || "10:30"}
                      containerRef={timeFieldRef}
                      onSelect={(next) =>
                        setValue("time", next, {
                          shouldValidate: true,
                          shouldDirty: true,
                        })
                      }
                      onClose={() => setTimeOpen(false)}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-auto pt-16">
            <AuthPrimaryButton
              variant="stack"
              enabled={isValid}
              disabled={!isValid}
            >
              Create
            </AuthPrimaryButton>
          </div>
        </form>
      </AuthBody>
    </AuthStackScreen>
  );
}
